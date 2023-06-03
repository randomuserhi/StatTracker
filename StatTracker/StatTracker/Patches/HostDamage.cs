using Agents;
using API;
using CharacterDestruction;
using Enemies;
using HarmonyLib;
using Player;

namespace StatTracker.Patches
{
    [HarmonyPatch]
    public static class HostDamage
    {
        #region Detecting Sentry Shots

        // Flag to determine if next shot is performed by a sentry
        public static string? sentryName = null;
        public static bool sentryShot = false;

        [HarmonyPatch(typeof(SentryGunInstance_Firing_Bullets), nameof(SentryGunInstance_Firing_Bullets.FireBullet))]
        [HarmonyPrefix]
        public static void Prefix_SentryGunFiringBullet(SentryGunInstance_Firing_Bullets __instance, bool doDamage, bool targetIsTagged)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!doDamage) return;

            sentryName = __instance.ArchetypeData.PublicName;
            var instance = __instance.GetComponent<SentryGunInstance>();
            if (instance != null)
            {
                sentryName = instance.PublicName;
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"Could not find sentry gun instance, this should not happen.");
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

        #region Keeping track of mines

        public class Mine
        {
            public string name;
            public SNetwork.SNet_Player owner;
            public int instanceID;
            public Mine(SNetwork.SNet_Player owner, string name, int instanceID)
            {
                this.owner = owner;
                this.name = name;
                this.instanceID = instanceID;
            }
        }
        public static Dictionary<int, Mine> mines = new Dictionary<int, Mine>();
        public static Mine? currentMine = null;

        [HarmonyPatch(typeof(MineDeployerInstance), nameof(MineDeployerInstance.OnSpawn))]
        [HarmonyPrefix]
        public static void Spawn(MineDeployerInstance __instance, pItemSpawnData spawnData)
        {
            if (!SNetwork.SNet.IsMaster) return;

            int instanceID = __instance.gameObject.GetInstanceID();

            SNetwork.SNet_Player player;
            if (spawnData.owner.TryGetPlayer(out player))
            {
                if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"Mine instance spawned by {player.NickName} - {spawnData.itemData.itemID_gearCRC} [{instanceID}]");

                switch (spawnData.itemData.itemID_gearCRC)
                {
                    case 125: // Mine deployer mine
                        mines.Add(instanceID, new Mine(player, "Krieger O4", instanceID));
                        break;
                    case 139: // Consumable mine
                        mines.Add(instanceID, new Mine(player, "Consumable Mine", instanceID));
                        break;
                    /*144: // Cfoam mine
                        break;*/
                }
            }
        }

        // NOTE(randomuserhi) => has a agent parameter to know who picked up the mine, may use in the future
        [HarmonyPatch(typeof(MineDeployerInstance), nameof(MineDeployerInstance.SyncedPickup))]
        [HarmonyPrefix]
        public static void SyncedPickup(MineDeployerInstance __instance)
        {
            int instanceID = __instance.gameObject.GetInstanceID();

            mines.Remove(instanceID);

            if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"Mine instance [{instanceID}] was picked up.");
        }

        [HarmonyPatch(typeof(MineDeployerInstance_Detonate_Explosive), nameof(MineDeployerInstance_Detonate_Explosive.DoExplode))]
        [HarmonyPrefix]
        public static void Prefix_DoExplode(MineDeployerInstance_Detonate_Explosive __instance)
        {
            if (!SNetwork.SNet.IsMaster) return;

            int instanceID = __instance.gameObject.GetInstanceID();
            if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"Mine instance [{instanceID}] detonated.");

            if (mines.ContainsKey(instanceID))
            {
                currentMine = mines[instanceID];
                mines.Remove(__instance.gameObject.GetInstanceID());
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"Mine did not exist in catalogue, this should not happen.");
        }

        [HarmonyPatch(typeof(MineDeployerInstance_Detonate_Explosive), nameof(MineDeployerInstance_Detonate_Explosive.DoExplode))]
        [HarmonyPostfix]
        public static void Postfix_DoExplode()
        {
            currentMine = null;
        }

        #endregion

        private static float oldHealth = 0;

        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveExplosionDamage))]
        [HarmonyPrefix]
        public static void Prefix_ExplosionDamage(Dam_EnemyDamageBase __instance, pExplosionDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            // Reset limb destruction
            limbBroke = false;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveExplosionDamage))]
        [HarmonyPostfix]
        public static void Postfix_ExplosionDamage(Dam_EnemyDamageBase __instance, pExplosionDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            // Record damage data
            if (currentMine != null)
            {
                float damage = oldHealth - __instance.Health;
                bool willDie = __instance.Health <= 0 && damage > 0;

                // Record damage done
                PlayerStats stats;
                HostTracker.GetPlayer(currentMine.owner, out stats);

                // Record enemy data
                EnemyAgent owner = __instance.Owner;
                EnemyData eData;
                HostTracker.GetEnemyData(owner, out eData);

                string enemyType = eData.enemyType;

                // player stats
                GearData mine = stats.gears[currentMine.name];
                mine.damage += damage;

                if (ConfigManager.Debug)
                {
                    APILogger.Debug(Module.Name, $"[Prefix] {damage} Mine Damage done by {currentMine.owner.NickName}. IsBot: {currentMine.owner.IsBot}");
                    APILogger.Debug(Module.Name, $"[Prefix] {mine.name}: {mine.damage}");
                }

                // register kill
                if (willDie)
                {
                    mine.enemiesKilled[enemyType] += 1;

                    eData.alive = false;
                    eData.killer = stats.playerID;
                    eData.killerGear = mine.name;
                    eData.mineInstance = currentMine.instanceID;
                    eData.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;

                    if (ConfigManager.Debug)
                        APILogger.Debug(Module.Name, $"{mine.name}: {mine.enemiesKilled[enemyType]} {enemyType} killed");
                }

                // Get limb data
                if (!limbBroke) return;

                LimbData lData;
                if (limbBrokeID >= 0)
                    lData = eData.limbData[__instance.DamageLimbs[limbBrokeID].name];
                else return;

                eData.health = __instance.Health;

                if (lData.breaker != null)
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Postfix] Limb is already destroyed.");
                    return;
                }
                lData.breaker = stats.playerID;

                // player stats
                lData.breakerGear = currentMine.name;
                lData.gears[stats.playerID].gear[currentMine.name] += damage;

                if (ConfigManager.Debug)
                    if (lData.breaker != null)
                        APILogger.Debug(Module.Name, $"[Postfix] Limb {lData.name} broken by {currentMine.owner.NickName} with {lData.breakerGear}");
                    else
                        APILogger.Debug(Module.Name, $"[Postfix] lData.breaker was null, this should not happen.");
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"[Prefix] Unable to find source mine.");

            // Reset limb destruction
            limbBroke = false;
        }

        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveBulletDamage))]
        [HarmonyPrefix]
        public static void Prefix_BulletDamage(Dam_EnemyDamageBase __instance, pBulletDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            // Reset limb destruction
            limbBroke = false;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveBulletDamage))]
        [HarmonyPostfix]
        public static void Postfix_BulletDamage(Dam_EnemyDamageBase __instance, pBulletDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            // Record damage data
            Agent sourceAgent;
            if (data.source.TryGet(out sourceAgent))
            {
                float damage = oldHealth - __instance.Health;
                bool willDie = __instance.Health <= 0 && damage > 0;

                PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
                if (p == null) // Check damage was done by a player
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Prefix] Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }

                // Record damage done
                PlayerStats stats;
                HostTracker.GetPlayer(p, out stats);

                // Record enemy data
                EnemyAgent owner = __instance.Owner;
                EnemyData eData;
                HostTracker.GetEnemyData(owner, out eData);
                LimbData lData;
                if (data.limbID >= 0)
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
                        GearData weapon = stats.gears[currentEquipped.PublicName];
                        weapon.damage += damage;

                        // enemy stats
                        lData.gears[stats.playerID].gear[weapon.name] += damage;

                        if (ConfigManager.Debug)
                        {
                            APILogger.Debug(Module.Name, $"[Prefix] {damage} Bullet Damage done by {p.PlayerName}. Weapon: {weapon.name} IsBot: {p.Owner.IsBot}");
                            APILogger.Debug(Module.Name, $"[Prefix] {weapon.name}: {weapon.damage}");
                        }

                        // register kill
                        if (willDie)
                        {
                            weapon.enemiesKilled[enemyType] += 1;

                            eData.alive = false;
                            eData.killer = stats.playerID;
                            eData.killerGear = weapon.name;
                            eData.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;

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
                    GearData sentry = stats.gears[sentryName];
                    sentry.damage += damage;

                    // enemy stats
                    lData.gears[stats.playerID].gear[sentry.name] += damage;

                    if (ConfigManager.Debug)
                    {
                        APILogger.Debug(Module.Name, $"[Prefix] {damage} Bullet Damage done by {p.PlayerName}. Sentry: {sentryName} IsBot: {p.Owner.IsBot}");
                        APILogger.Debug(Module.Name, $"[Prefix] {sentry.name}: {sentry.damage}");
                    }

                    // register kill
                    if (willDie)
                    {
                        sentry.enemiesKilled[enemyType] += 1;

                        eData.alive = false;
                        eData.killer = stats.playerID;
                        eData.killerGear = sentry.name;
                        eData.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;

                        if (ConfigManager.Debug)
                            APILogger.Debug(Module.Name, $"[Prefix] {sentry.name}: {sentry.enemiesKilled[enemyType]} {enemyType} killed");
                    }
                }
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"[Prefix] Sentry name was null, this should not happen.");

                // Get limb data
                if (!limbBroke) return;

                if (data.limbID >= 0)
                    lData = eData.limbData[__instance.DamageLimbs[data.limbID].name];
                else return;

                eData.health = __instance.Health;

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
                APILogger.Debug(Module.Name, $"[Prefix] Unable to find source agent.");

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

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_EnemyDamageBase), nameof(Dam_EnemyDamageBase.ReceiveMeleeDamage))]
        [HarmonyPostfix]
        public static void Postfix_MeleeDamage(Dam_EnemyDamageBase __instance, pFullDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            EnemyAgent owner = __instance.Owner;

            // Record damage data
            Agent sourceAgent;
            if (data.source.TryGet(out sourceAgent))
            {
                float damage = oldHealth - __instance.Health;
                bool willDie = __instance.Health <= 0 && damage > 0;

                PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
                if (p == null) // Check damage was done by a player
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Prefix] Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }

                // Record damage done
                PlayerStats stats;
                HostTracker.GetPlayer(p, out stats);

                // Record enemy data
                EnemyData eData;
                HostTracker.GetEnemyData(owner, out eData);
                LimbData lData;
                if (data.limbID >= 0)
                    lData = eData.limbData[__instance.DamageLimbs[data.limbID].name];
                else
                    lData = eData.limbData["unknown"];

                string enemyType = eData.enemyType;

                // Get weapon used
                ItemEquippable currentEquipped = p.Inventory.WieldedItem;
                if (!currentEquipped.IsWeapon && !currentEquipped.CanReload)
                {
                    // player stats
                    GearData weapon = stats.gears[currentEquipped.PublicName];
                    weapon.damage += damage;

                    // enemy stats
                    lData.gears[stats.playerID].gear[weapon.name] += damage;

                    if (ConfigManager.Debug)
                    {
                        APILogger.Debug(Module.Name, $"[Prefix] {damage} Melee Damage done by {p.PlayerName}. Weapon: {weapon.name} IsBot: {p.Owner.IsBot}");
                        APILogger.Debug(Module.Name, $"[Prefix] {weapon.name}: {weapon.damage}");
                    }

                    // register kill
                    if (willDie)
                    {
                        weapon.enemiesKilled[enemyType] += 1;

                        eData.alive = false;
                        eData.killer = stats.playerID;
                        eData.killerGear = weapon.name;
                        eData.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;

                        if (ConfigManager.Debug)
                            APILogger.Debug(Module.Name, $"[Prefix] {weapon.name}: {weapon.enemiesKilled[enemyType]} {enemyType} killed");
                    }
                }
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"[Prefix] Currently equipped is not a melee weapon, this should not happen.\nIsWeapon: {currentEquipped.IsWeapon}\nCanReload: {currentEquipped.CanReload}");

                if (!limbBroke) return;

                eData.health = __instance.Health;

                if (lData.breaker != null)
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"[Postfix] Limb is already destroyed.");
                    return;
                }
                lData.breaker = stats.playerID;

                // Get weapon used
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
                APILogger.Debug(Module.Name, $"[Prefix] Unable to find source agent.");

            // Reset limb destruction
            limbBroke = false;
        }
    }
}
