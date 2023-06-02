using Agents;
using API;
using CharacterDestruction;
using Enemies;
using HarmonyLib;
using Il2CppSystem;
using Player;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using UnityEngine;
using static GameData.GD;
using static UnityEngine.UI.GridLayoutGroup;

namespace StatTracker.Patches
{
    [HarmonyPatch]
    public static class HostDamagePatches
    {
        #region Detecting Sentry Shots

        // Flag to determine if next shot is performed by a sentry
        private static string? sentryName = null;
        private static bool sentryShot = false;

        [HarmonyPatch(typeof(SentryGunInstance_Firing_Bullets), nameof(SentryGunInstance_Firing_Bullets.FireBullet))]
        [HarmonyPrefix]
        public static void Prefix_SentryGunFiringBullet(SentryGunInstance_Firing_Bullets __instance, bool doDamage, bool targetIsTagged)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!doDamage) return;

            sentryName = __instance.ArchetypeData.PublicName;
            sentryShot = true;
        }
        [HarmonyPatch(typeof(SentryGunInstance_Firing_Bullets), nameof(SentryGunInstance_Firing_Bullets.FireBullet))]
        [HarmonyPostfix]
        public static void Postfix_SentryGunFiringBullet()
        {
            sentryName = null;
            sentryShot = false;
        }

        // Special case for shotgun sentry

        [HarmonyPatch(typeof(SentryGunInstance_Firing_Bullets), nameof(SentryGunInstance_Firing_Bullets.UpdateFireShotgunSemi))]
        [HarmonyPrefix]
        public static void Prefix_ShotgunSentryFiring(SentryGunInstance_Firing_Bullets __instance, bool isMaster, bool targetIsTagged)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!isMaster) return;

            sentryName = __instance.ArchetypeData.PublicName;
            sentryShot = true;
        }
        [HarmonyPatch(typeof(SentryGunInstance_Firing_Bullets), nameof(SentryGunInstance_Firing_Bullets.UpdateFireShotgunSemi))]
        [HarmonyPostfix]
        public static void Postfix_ShotgunSentryFiring()
        {
            sentryName = null;
            sentryShot = false;
        }

        #endregion

        #region Detecting limb destruction
        
        private static bool limbBroke = false; // Flag is true when limb is broken
        private static int limbBrokeID = 0; // if flag is true, holds the id of the limb that broke

        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.SendDestroyLimb))]
        [HarmonyPrefix]
        public static void DestroyLimb(int limbID, sDestructionEventData destructionEventData)
        {
            if (!SNetwork.SNet.IsMaster) return;

            limbBroke = true;
            limbBrokeID = limbID;
        }

        #endregion

        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveBulletDamage))]
        [HarmonyPrefix]
        public static void Prefix_BulletDamage(Dam_EnemyDamageBase __instance, pBulletDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            // Reset limb destruction
            limbBroke = false;

            float damage = AgentModifierManager.ApplyModifier(__instance.Owner, AgentModifier.ProjectileResistance, data.damage.Get(__instance.HealthMax));
            bool willDie = __instance.WillDamageKill(damage);
            damage = Mathf.Min(damage, __instance.Health);
            if (damage == 0) willDie = false; // Note(randomuserhi): If damage is 0, enemy is already dead.

            // Record damage data
            Agent sourceAgent;
            if (data.source.TryGet(out sourceAgent))
            {
                PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
                if (p == null) // Check damage was done by a player
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Prefix] Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }

                // Record damage done
                PlayerStats stats;
                ClientTracker.GetPlayer(p, out stats);

                // Record enemy data
                EnemyAgent owner = __instance.Owner;
                EnemyData eData;
                HostTracker.GetEnemyData(owner, out eData);
                LimbData lData;
                if (data.limbID > 0)
                    lData = eData.limbData[__instance.DamageLimbs[data.limbID].name];
                else
                    lData = eData.limbData["unknown"];

                string enemyType = eData.enemyType;

                if (!sentryShot) // Damage done by weapon
                {
                    // Get weapon used
                    ItemEquippable currentEquipped = p.Inventory.WieldedItem;
                    if (currentEquipped.IsWeapon && currentEquipped.CanReload)
                    {
                        // player stats
                        GearData weapon = stats.weapons[currentEquipped.PublicName];
                        weapon.damage += damage;

                        // enemy stats
                        lData.weapons[weapon.name].damage += damage;

                        if (ConfigManager.Debug)
                        {
                            APILogger.Debug(Module.Name, $"[Prefix] {damage} Bullet Damage done by {p.PlayerName}. Weapon: {weapon.name} IsBot: {p.Owner.IsBot}");
                            APILogger.Debug(Module.Name, $"[Prefix] {weapon.name}: {weapon.damage}");
                        }

                        // register kill
                        if (willDie)
                        {
                            weapon.enemiesKilled[enemyType] += 1;

                            if (ConfigManager.Debug)
                                APILogger.Debug(Module.Name, $"{weapon.name}: {weapon.enemiesKilled[enemyType]} {enemyType} killed");
                        }
                    }
                    else if (ConfigManager.Debug)
                        APILogger.Debug(Module.Name, $"[Prefix] Currently equipped is not a reloadable weapon, this should not happen.\nIsWeapon: {currentEquipped.IsWeapon}\nCanReload: {currentEquipped.CanReload}");
                }
                else if (sentryName != null) // Damage done by sentry
                {
                    // player stats
                    GearData sentry = stats.tools[sentryName];
                    sentry.damage += damage;

                    // enemy stats
                    lData.tools[sentry.name].damage += damage;

                    if (ConfigManager.Debug)
                    {
                        APILogger.Debug(Module.Name, $"[Prefix] {damage} Bullet Damage done by {p.PlayerName}. Sentry: {sentryName} IsBot: {p.Owner.IsBot}");
                        APILogger.Debug(Module.Name, $"[Prefix] {sentry.name}: {sentry.damage}");
                    }

                    // register kill
                    if (willDie)
                    {
                        sentry.enemiesKilled[enemyType] += 1;

                        if (ConfigManager.Debug)
                            APILogger.Debug(Module.Name, $"[Prefix] {sentry.name}: {sentry.enemiesKilled[enemyType]} {enemyType} killed");
                    }
                }
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"[Prefix] Sentry name was null, this should not happen.");
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"[Prefix] Unable to find source agent.");
        }

        // Postfix to handle limb break
        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveBulletDamage))]
        [HarmonyPostfix]
        public static void Postfix_BulletDamage(Dam_EnemyDamageBase __instance, pBulletDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!limbBroke) return;

            // Get damage data
            Agent sourceAgent;
            if (data.source.TryGet(out sourceAgent))
            {
                PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
                if (p == null) // Check damage was done by a player
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Postfix] Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }

                // Get stats
                PlayerStats stats;
                ClientTracker.GetPlayer(p, out stats);

                // Get enemy data
                EnemyAgent owner = __instance.Owner;
                EnemyData eData;
                HostTracker.GetEnemyData(owner, out eData);
                LimbData lData;
                if (data.limbID > 0)
                    lData = eData.limbData[__instance.DamageLimbs[data.limbID].name];
                else return;

                if (lData.breaker != null)
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Postfix] Limb is already destroyed.");
                    return;
                }
                lData.breaker = stats.playerID;

                if (!sentryShot) // Damage done by weapon
                {
                    // Get weapon used
                    ItemEquippable currentEquipped = p.Inventory.WieldedItem;
                    if (currentEquipped.IsWeapon && currentEquipped.CanReload)
                    {
                        // player stats
                        lData.breakerGear = currentEquipped.PublicName;
                    }
                    else if (ConfigManager.Debug)
                        APILogger.Debug(Module.Name, $"[Postfix] Currently equipped is not a reloadable weapon, this should not happen.\nIsWeapon: {currentEquipped.IsWeapon}\nCanReload: {currentEquipped.CanReload}");
                }
                else if (sentryName != null) // Damage done by sentry
                {
                    // player stats
                    lData.breakerGear = sentryName;
                }
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"[Postfix] Sentry name was null, this should not happen.");

                if (ConfigManager.Debug)
                    if (lData.breaker != null)
                        APILogger.Debug(Module.Name, $"[Postfix] Limb {lData.name} broken by {p.PlayerName} with {lData.breakerGear}");
                    else
                        APILogger.Debug(Module.Name, $"[Postfix] lData.breaker was null, this should not happen.");
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"[Postfix] Unable to find source agent.");

            // Reset limb destruction
            limbBroke = false;
        }

        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveMeleeDamage))]
        [HarmonyPrefix]
        public static void Prefix_MeleeDamage(Dam_EnemyDamageBase __instance, pFullDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            // Reset limb destruction
            limbBroke = false;

            EnemyAgent owner = __instance.Owner;

            float damage = AgentModifierManager.ApplyModifier(__instance.Owner, AgentModifier.MeleeResistance, data.damage.Get(__instance.HealthMax));
            if (owner.Locomotion.CurrentStateEnum == ES_StateEnum.Hibernate)
                damage *= data.sleeperMulti.Get(10f);
            bool willDie = __instance.WillDamageKill(damage);
            damage = Mathf.Min(damage, __instance.Health);
            if (damage == 0) willDie = false; // Note(randomuserhi): If damage is 0, enemy is already dead.

            // Record damage data
            Agent sourceAgent;
            if (data.source.TryGet(out sourceAgent))
            {
                PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
                if (p == null) // Check damage was done by a player
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Prefix] Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }

                // Record damage done
                PlayerStats stats;
                ClientTracker.GetPlayer(p, out stats);

                // Record enemy data
                EnemyData eData;
                HostTracker.GetEnemyData(owner, out eData);
                LimbData lData;
                if (data.limbID > 0)
                    lData = eData.limbData[__instance.DamageLimbs[data.limbID].name];
                else
                    lData = eData.limbData["unknown"];

                string enemyType = eData.enemyType;

                // Get weapon used
                ItemEquippable currentEquipped = p.Inventory.WieldedItem;
                if (!currentEquipped.IsWeapon && !currentEquipped.CanReload)
                {
                    // player stats
                    GearData weapon = stats.weapons[currentEquipped.PublicName];
                    weapon.damage += damage;

                    // enemy stats
                    lData.weapons[weapon.name].damage += damage;

                    if (ConfigManager.Debug)
                    {
                        APILogger.Debug(Module.Name, $"[Prefix] {damage} Melee Damage done by {p.PlayerName}. Weapon: {weapon.name} IsBot: {p.Owner.IsBot}");
                        APILogger.Debug(Module.Name, $"[Prefix] {weapon.name}: {weapon.damage}");
                    }

                    // register kill
                    if (willDie)
                    {
                        weapon.enemiesKilled[enemyType] += 1;

                        if (ConfigManager.Debug)
                            APILogger.Debug(Module.Name, $"[Prefix] {weapon.name}: {weapon.enemiesKilled[enemyType]} {enemyType} killed");
                    }
                }
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"[Prefix] Currently equipped is not a melee weapon, this should not happen.\nIsWeapon: {currentEquipped.IsWeapon}\nCanReload: {currentEquipped.CanReload}");
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"[Prefix] Unable to find source agent.");
        }

        // Postfix to handle limb break
        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveMeleeDamage))]
        [HarmonyPostfix]
        public static void Postfix_MeleeDamage(Dam_EnemyDamageBase __instance, pFullDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!limbBroke) return;

            // Get damage data
            Agent sourceAgent;
            if (data.source.TryGet(out sourceAgent))
            {
                PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
                if (p == null) // Check damage was done by a player
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Postfix] Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }

                // Get stats
                PlayerStats stats;
                ClientTracker.GetPlayer(p, out stats);

                // Get enemy data
                EnemyAgent owner = __instance.Owner;
                EnemyData eData;
                HostTracker.GetEnemyData(owner, out eData);
                LimbData lData;
                if (data.limbID > 0)
                    lData = eData.limbData[__instance.DamageLimbs[data.limbID].name];
                else return;

                if (lData.breaker != null)
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Postfix] Limb is already destroyed.");
                    return;
                }
                lData.breaker = stats.playerID;

                // Get weapon used
                ItemEquippable currentEquipped = p.Inventory.WieldedItem;
                if (!currentEquipped.IsWeapon && !currentEquipped.CanReload)
                {
                    // player stats
                    lData.breakerGear = currentEquipped.PublicName;
                }
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"[Postfix] Currently equipped is not a melee weapon, this should not happen.\nIsWeapon: {currentEquipped.IsWeapon}\nCanReload: {currentEquipped.CanReload}");

                if (ConfigManager.Debug)
                    if (lData.breaker != null)
                        APILogger.Debug(Module.Name, $"[Postfix] Limb {lData.name} broken by {p.PlayerName} with {lData.breakerGear}");
                    else
                        APILogger.Debug(Module.Name, $"[Postfix] lData.breaker was null, this should not happen.");
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"[Postfix] Unable to find source agent.");

            // Reset limb destruction
            limbBroke = false;
        }
    }
}
