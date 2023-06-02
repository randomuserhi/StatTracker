using Agents;
using API;
using Enemies;
using HarmonyLib;
using Player;
using UnityEngine;

// TODO(randomuserhi): This manages tracking of personal stats (where possible) if host does not have the mod
//                     Since not all stats are trackable without host, this provides limited data about your own
//                     performance.

namespace StatTracker.Patches
{
    [HarmonyPatch]
    public static class ClientDamagePatches
    {
        // Clear out enemies that die over network
        [HarmonyPatch(typeof(EnemyAppearance), nameof(EnemyAppearance.OnDead))]
        [HarmonyPrefix]
        public static void OnDead(EnemyAppearance __instance)
        {
            if (SNetwork.SNet.IsMaster) return;

            EnemyAgent owner = __instance.m_owner;
            int instanceID = owner.GetInstanceID();

            ClientTracker.enemies.Remove(instanceID);
        }

        [HarmonyPatch(typeof(Dam_EnemyDamageLimb), nameof(Dam_EnemyDamageLimb.BulletDamage))]
        [HarmonyPrefix]
        public static void BulletDamage(Dam_EnemyDamageLimb __instance, float dam, Agent sourceAgent, Vector3 position, Vector3 direction, Vector3 normal, bool allowDirectionalBonus, float staggerMulti, float precisionMulti)
        {
            if (SNetwork.SNet.IsMaster) return;
            PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
            if (p == null) // Check damage was done by a player
            {
                if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                return;
            }
            if (p.Owner.IsBot) return; // Check player isn't a bot

            // Apply damage modifiers (head, occiput etc...)
            float num = __instance.ApplyWeakspotAndArmorModifiers(dam, precisionMulti);
            num = __instance.ApplyDamageFromBehindBonus(num, position, direction);

            Dam_EnemyDamageBase m_base = __instance.m_base;
            EnemyAgent owner = m_base.Owner;
            int instanceID = owner.GetInstanceID();
            string enemyType = owner.EnemyData.name;

            // Get weapon used
            ItemEquippable currentEquipped = p.Inventory.WieldedItem;
            if (currentEquipped.IsWeapon && currentEquipped.CanReload)
            {
                // Calculate damage done
                float damage;
                ClientTracker.Enemy e;
                if (ClientTracker.GetEnemy(instanceID, out e))
                {
                    damage = e.health;
                    e.health -= num;
                }
                else
                {
                    damage = m_base.HealthMax;
                    e.maxHealth = m_base.HealthMax;
                    e.health = m_base.HealthMax - num;
                }
                damage = Mathf.Clamp(num, 0, damage);
                bool willDie = e.health <= 0;
                if (damage == 0) willDie = false; // Note(randomuserhi): If damage is 0, enemy is already dead.

                // Record damage done
                PlayerStats stats;
                ClientTracker.GetPlayer(p, out stats);

                GearData weapon = stats.weapons[currentEquipped.PublicName];
                weapon.damage += damage;

                if (ConfigManager.Debug)
                {
                    APILogger.Debug(Module.Name, $"{damage} Bullet Damage done by {p.PlayerName}. Weapon: {weapon.name} IsBot: {p.Owner.IsBot}");
                    APILogger.Debug(Module.Name, $"{weapon.name}: {weapon.damage}");
                    APILogger.Debug(Module.Name, $"Tracked current HP: {e.health}, [{e.instanceID}]");
                }

                // Record kill
                if (willDie)
                {
                    weapon.enemiesKilled[enemyType] += 1;
                    ClientTracker.enemies.Remove(instanceID);

                    if (ConfigManager.Debug)
                        APILogger.Debug(Module.Name, $"{weapon.name}: {weapon.enemiesKilled[enemyType]} {enemyType} killed");
                }
            }
            else if (ConfigManager.Debug) 
                APILogger.Debug(Module.Name, $"Currently equipped is not a reloadable weapon, this should not happen.\nIsWeapon: {currentEquipped.IsWeapon}\nCanReload: {currentEquipped.CanReload}");
        }

        [HarmonyPatch(typeof(Dam_EnemyDamageLimb), nameof(Dam_EnemyDamageLimb.MeleeDamage))]
        [HarmonyPrefix]
        public static void MeleeDamage(Dam_EnemyDamageLimb __instance, float dam, Agent sourceAgent, Vector3 position, Vector3 direction, float staggerMulti, float precisionMulti, float environmentMulti, float backstabberMulti, float sleeperMulti, bool skipLimbDestruction, DamageNoiseLevel damageNoiseLevel)
        {
            if (SNetwork.SNet.IsMaster) return;
            PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
            if (p == null) // Check damage was done by a player
            {
                if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                return;
            }
            if (p.Owner.IsBot) return; // Check player isnt a bot

            // Apply damage modifiers (head, occiput etc...)
            float num = __instance.ApplyWeakspotAndArmorModifiers(dam, precisionMulti);
            num = __instance.ApplyDamageFromBehindBonus(num, position, direction, backstabberMulti);

            Dam_EnemyDamageBase m_base = __instance.m_base;
            EnemyAgent owner = m_base.Owner;
            int instanceID = owner.GetInstanceID();
            string enemyType = owner.EnemyData.name;

            // Get weapon used
            ItemEquippable currentEquipped = p.Inventory.WieldedItem;
            if (!currentEquipped.IsWeapon && !currentEquipped.CanReload)
            {
                // Calculate damage done
                float damage;
                ClientTracker.Enemy e;
                if (ClientTracker.GetEnemy(instanceID, out e))
                {
                    damage = e.health;
                    e.health -= num;
                }
                else
                {
                    damage = m_base.HealthMax;
                    e.maxHealth = m_base.HealthMax;
                    e.health = m_base.HealthMax - num;
                }
                damage = Mathf.Clamp(num, 0, damage);
                bool willDie = e.health <= 0;
                if (damage == 0) willDie = false; // Note(randomuserhi): If damage is 0, enemy is already dead.

                // Record damage done
                PlayerStats stats;
                ClientTracker.GetPlayer(p, out stats);

                GearData weapon = stats.weapons[currentEquipped.PublicName];
                weapon.damage += damage;

                if (ConfigManager.Debug)
                {
                    APILogger.Debug(Module.Name, $"{damage} Melee Damage done by {p.PlayerName}. Weapon: {weapon.name} IsBot: {p.Owner.IsBot}");
                    APILogger.Debug(Module.Name, $"{weapon.name}: {weapon.damage}");
                    APILogger.Debug(Module.Name, $"Tracked current HP: {e.health}, [{e.instanceID}]");
                }

                // Record kill
                if (willDie)
                {
                    weapon.enemiesKilled[enemyType] += 1;
                    ClientTracker.enemies.Remove(instanceID);

                    if (ConfigManager.Debug)
                        APILogger.Debug(Module.Name, $"{weapon.name}: {weapon.enemiesKilled[enemyType]} {enemyType} killed");
                }
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"Currently equipped is not a melee weapon, this should not happen.\nIsWeapon: {currentEquipped.IsWeapon}\nCanReload: {currentEquipped.CanReload}");
        }
    }
}
