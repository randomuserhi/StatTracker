using HarmonyLib;
using Agents;
using API;
using Player;
using Enemies;
using UnityEngine;
using SNetwork;
using static Agents.AgentReplicatedActions;
using GameData;
using ChainedPuzzles;
using Gear;

namespace StatTracker.Patches
{
    [HarmonyPatch]
    public static class HostPlayerDamage
    {
        #region Keeping track of shooter projectiles

        private static EnemyAgent? currentShooter = null;

        [HarmonyPatch(typeof(EAB_ProjectileShooter), nameof(EAB_ProjectileShooter.FireAtAgent))]
        [HarmonyPrefix]
        public static void Prefix_FireAtAgent(EAB_ProjectileShooter __instance)
        {
            currentShooter = __instance.m_owner;
        }

        [HarmonyPatch(typeof(EAB_ProjectileShooter), nameof(EAB_ProjectileShooter.FireAtAgent))]
        [HarmonyPostfix]
        public static void Postfix_FireAtAgent(EAB_ProjectileShooter __instance)
        {
            currentShooter = null;
        }

        [HarmonyPatch(typeof(EAB_ProjectileShooter), nameof(EAB_ProjectileShooter.FireChaos))]
        [HarmonyPrefix]
        public static void Prefix_FireChaos(EAB_ProjectileShooter __instance)
        {
            currentShooter = __instance.m_owner;
        }

        [HarmonyPatch(typeof(EAB_ProjectileShooter), nameof(EAB_ProjectileShooter.FireChaos))]
        [HarmonyPostfix]
        public static void Postfix_FireChaos(EAB_ProjectileShooter __instance)
        {
            currentShooter = null;
        }

        public static Dictionary<int, EnemyAgent> projectileOwners = new Dictionary<int, EnemyAgent>();

        [HarmonyPatch(typeof(ProjectileManager), nameof(ProjectileManager.DoFireTargeting))]
        [HarmonyPrefix]
        public static bool DoFireTargeting(ProjectileManager __instance, ProjectileManager.pFireTargeting data)
        {
            if (!SNetwork.SNet.IsMaster) return true;

            Agent? comp = null;
            data.target.TryGet(out comp);
            GameObject projectile = ProjectileManager.SpawnProjectileType(data.type, data.position, Quaternion.LookRotation(data.forward));
            IProjectile component = projectile.GetComponent<IProjectile>();
            ProjectileTargeting targeting = projectile.GetComponent<ProjectileTargeting>();
            if (targeting != null)
                __instance.m_projectiles.Add(targeting);
            component.OnFire(comp);

            if (currentShooter != null)
                projectileOwners.Add(projectile.GetInstanceID(), currentShooter);
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"currentShooter was null, this should not happen.");

            return false;
        }

        [HarmonyPatch(typeof(ProjectileTargeting), nameof(ProjectileTargeting.OnDestroy))]
        [HarmonyPrefix]
        public static void OnDestroy(ProjectileTargeting __instance)
        {
            if (!SNetwork.SNet.IsMaster) return;

            if (projectileOwners.Remove(__instance.gameObject.GetInstanceID()))
                APILogger.Debug(Module.Name, $"Projectile successfully removed.");
        }

        private static EnemyAgent? hitByShooter = null;

        [HarmonyPatch(typeof(ProjectileBase), nameof(ProjectileBase.Collision))]
        [HarmonyPrefix]
        public static void Prefix_Collision(ProjectileBase __instance)
        {
            if (!SNetwork.SNet.IsMaster) return;

            int instanceID = __instance.gameObject.GetInstanceID();
            if (projectileOwners.ContainsKey(instanceID))
                hitByShooter = projectileOwners[instanceID];
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"Projectile was not tracked, this should not happen.");

            if (projectileOwners.Remove(__instance.gameObject.GetInstanceID()))
                APILogger.Debug(Module.Name, $"Projectile successfully removed.");
        }

        [HarmonyPatch(typeof(ProjectileBase), nameof(ProjectileBase.Collision))]
        [HarmonyPostfix]
        public static void Postfix_Collision()
        {
            hitByShooter = null;
        }

        [HarmonyPatch(typeof(Dam_SyncedDamageBase), nameof(Dam_SyncedDamageBase.ShooterProjectileDamage))]
        [HarmonyPrefix]
        public static bool ShooterProjectileDamage(Dam_SyncedDamageBase __instance, float dam, Vector3 position)
        {
            if (!SNetwork.SNet.IsMaster) return true;

            pMediumDamageData data = new pMediumDamageData();
            data.damage.Set(dam, __instance.HealthMax);
            data.localPosition.Set(position - __instance.GetBaseAgent().Position, 10f);
            if (hitByShooter != null) data.source.Set(hitByShooter);
            else if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"hitByShooter was null, this should not happen.");
            if (__instance.SendPacket())
            {
                if (SNet.IsMaster)
                {
                    __instance.m_shooterProjectileDamagePacket.Send(data, SNet_ChannelType.GameNonCritical);
                }
                else
                {
                    __instance.m_shooterProjectileDamagePacket.Send(data, SNet_ChannelType.GameNonCritical, SNet.Master);
                }
            }
            if (__instance.SendLocally())
            {
                __instance.ReceiveShooterProjectileDamage(data);
            }

            return false;
        }

        #endregion

        private static float oldHealth = 0;
        private static bool wasAlive = false;

        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveFallDamage))]
        [HarmonyPrefix]
        public static void Prefix_ReceiveFallDamage(Dam_PlayerDamageBase __instance, pMiniDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            wasAlive = __instance.Owner.Alive && __instance.Health > 0;
            if (!wasAlive) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveFallDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveFallDamage(Dam_PlayerDamageBase __instance, pMiniDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!wasAlive) return;

            PlayerStats stats;
            HostTracker.GetPlayer(__instance.Owner, out stats);

            float damage = oldHealth - __instance.Health;

            DamageEvent damageEvent = new DamageEvent();

            damageEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
            damageEvent.type = DamageEvent.Type.FallDamage;
            damageEvent.damage = damage;
            damageEvent.playerID = stats.playerID;

            stats.damageTaken.Add(damageEvent);

            if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"{__instance.Owner.PlayerName} took {damageEvent.damage} fall damage.");
        }


        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveTentacleAttackDamage))]
        [HarmonyPrefix]
        public static void Prefix_ReceiveTentacleAttackDamage(Dam_PlayerDamageBase __instance, pMediumDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            wasAlive = __instance.Owner.Alive && __instance.Health > 0;
            if (!wasAlive) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveTentacleAttackDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveTentacleAttackDamage(Dam_PlayerDamageBase __instance, pMediumDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!wasAlive) return;

            PlayerStats stats;
            HostTracker.GetPlayer(__instance.Owner, out stats);

            float damage = oldHealth - __instance.Health;

            if (data.source.TryGet(out Agent sourceAgent))
            {
                // Get enemy agent
                EnemyAgent? e = sourceAgent.TryCast<EnemyAgent>();
                if (e == null) // Check damage was done by an enemy
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"Could not find EnemyAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }
                EnemyData eData;
                HostTracker.GetEnemyData(e, out eData);

                // Record damage
                damage = AgentModifierManager.ApplyModifier(sourceAgent, AgentModifier.MeleeDamage, damage);

                DamageEvent damageEvent = new DamageEvent();

                damageEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                damageEvent.type = DamageEvent.Type.Tongue;
                damageEvent.damage = damage;
                damageEvent.enemyInstanceID = eData.instanceID;

                stats.damageTaken.Add(damageEvent);

                if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"{__instance.Owner.PlayerName} took {damageEvent.damage} tongue damage from {eData.enemyType} [{damageEvent.enemyInstanceID}].");
            }
        }

        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveMeleeDamage))]
        [HarmonyPrefix]
        public static void Prefix_ReceiveMeleeDamage(Dam_PlayerDamageBase __instance, pFullDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            wasAlive = __instance.Owner.Alive && __instance.Health > 0;
            if (!wasAlive) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveMeleeDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveMeleeDamage(Dam_PlayerDamageBase __instance, pFullDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!wasAlive) return;

            PlayerStats stats;
            HostTracker.GetPlayer(__instance.Owner, out stats);

            float damage = oldHealth - __instance.Health;

            if (data.source.TryGet(out Agent sourceAgent))
            {
                // Get enemy agent
                EnemyAgent? e = sourceAgent.TryCast<EnemyAgent>();
                if (e == null) // Check damage was done by an enemy
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"Could not find EnemyAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }
                EnemyData eData;
                HostTracker.GetEnemyData(e, out eData);

                // Record damage
                damage = AgentModifierManager.ApplyModifier(sourceAgent, AgentModifier.MeleeDamage, damage);

                DamageEvent damageEvent = new DamageEvent();

                damageEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                damageEvent.type = DamageEvent.Type.Melee;
                damageEvent.damage = damage;
                damageEvent.enemyInstanceID = eData.instanceID;

                stats.damageTaken.Add(damageEvent);

                if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"{__instance.Owner.PlayerName} took {damageEvent.damage} melee damage from {eData.enemyType} [{damageEvent.enemyInstanceID}].");
            }
        }

        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveShooterProjectileDamage))]
        [HarmonyPrefix]
        public static void Prefix_ReceiveShooterProjectileDamage(Dam_PlayerDamageBase __instance, pMediumDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            wasAlive = __instance.Owner.Alive && __instance.Health > 0;
            if (!wasAlive) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveShooterProjectileDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveShooterProjectileDamage(Dam_PlayerDamageBase __instance, pMediumDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!wasAlive) return;

            PlayerStats stats;
            HostTracker.GetPlayer(__instance.Owner, out stats);

            float damage = oldHealth - __instance.Health;

            DamageEvent damageEvent = new DamageEvent();
            damageEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
            damageEvent.type = DamageEvent.Type.ShooterPellet;
            damageEvent.enemyInstanceID = null;

            if (data.source.TryGet(out Agent sourceAgent))
            {
                // Get enemy agent
                EnemyAgent? e = sourceAgent.TryCast<EnemyAgent>();
                if (e == null) // Check damage was done by an enemy
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"Could not find EnemyAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }
                EnemyData eData;
                HostTracker.GetEnemyData(e, out eData);

                damage = AgentModifierManager.ApplyModifier(sourceAgent, AgentModifier.StandardWeaponDamage, damage);

                damageEvent.enemyInstanceID = eData.instanceID;
            }

            damageEvent.damage = damage;
            stats.damageTaken.Add(damageEvent);

            if (ConfigManager.Debug)
                if (damageEvent.enemyInstanceID != null)
                    APILogger.Debug(Module.Name, $"{__instance.Owner.PlayerName} took {damageEvent.damage} shooter projectile damage from [{damageEvent.enemyInstanceID}].");
                else
                    APILogger.Debug(Module.Name, $"{__instance.Owner.PlayerName} took {damageEvent.damage} shooter projectile damage.");
        }

        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveBulletDamage))]
        [HarmonyPrefix]
        public static void Prefix_ReceiveBulletDamage(Dam_PlayerDamageBase __instance, pBulletDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            wasAlive = __instance.Owner.Alive && __instance.Health > 0;
            if (!wasAlive) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveBulletDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveBulletDamage(Dam_PlayerDamageBase __instance, pBulletDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!wasAlive) return;

            PlayerStats stats;
            HostTracker.GetPlayer(__instance.Owner, out stats);

            float damage = oldHealth - __instance.Health;

            if (data.source.TryGet(out Agent sourceAgent))
            {
                // Get player agent
                PlayerAgent? p = sourceAgent.TryCast<PlayerAgent>();
                if (p == null) // Check damage was done by an enemy
                {
                    if (ConfigManager.Debug) APILogger.Debug(Module.Name, $"Could not find PlayerAgent, damage was done by agent of type: {sourceAgent.m_type.ToString()}.");
                    return;
                }
                PlayerStats other;
                HostTracker.GetPlayer(p, out other);

                DamageEvent damageEvent = new DamageEvent();

                damageEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                damageEvent.type = DamageEvent.Type.PlayerBullet;
                damageEvent.damage = damage;
                damageEvent.playerID = other.playerID;

                if (!HostDamage.sentryShot) // Damage done by weapon
                {
                    // Get weapon used
                    ItemEquippable currentEquipped = p.Inventory.WieldedItem;
                    if (currentEquipped.IsWeapon && currentEquipped.CanReload)
                        damageEvent.gearName = currentEquipped.PublicName;
                    else if (ConfigManager.Debug)
                        APILogger.Debug(Module.Name, $"Currently equipped is not a reloadable weapon, this should not happen.\nIsWeapon: {currentEquipped.IsWeapon}\nCanReload: {currentEquipped.CanReload}");
                }
                else if (HostDamage.sentryName != null) // Damage done by sentry
                    damageEvent.gearName = HostDamage.sentryName;
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"Sentry name was null, this should not happen.");

                stats.damageTaken.Add(damageEvent);

                if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"{__instance.Owner.PlayerName} took {damageEvent.damage} bullet damage from {p.PlayerName} [{damageEvent.gearName}].");
            }
        }

        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveExplosionDamage))]
        [HarmonyPrefix]
        public static void Prefix_ReceiveExplosionDamage(Dam_PlayerDamageBase __instance, pExplosionDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            wasAlive = __instance.Owner.Alive && __instance.Health > 0;
            if (!wasAlive) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveExplosionDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveExplosionDamage(Dam_PlayerDamageBase __instance, pExplosionDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!wasAlive) return;

            PlayerStats stats;
            HostTracker.GetPlayer(__instance.Owner, out stats);

            float damage = oldHealth - __instance.Health;

            if (HostDamage.currentMine != null)
            {
                PlayerStats other;
                HostTracker.GetPlayer(HostDamage.currentMine.owner, out other);

                DamageEvent damageEvent = new DamageEvent();

                damageEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                damageEvent.type = DamageEvent.Type.PlayerExplosive;
                damageEvent.damage = damage;
                damageEvent.playerID = other.playerID;
                damageEvent.gearName = HostDamage.currentMine.name;

                stats.damageTaken.Add(damageEvent);

                if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"{__instance.Owner.PlayerName} took {damageEvent.damage} explosive damage from {other.playerName} [{damageEvent.gearName}].");
            }
        }

        #region Tracking scan time

        [HarmonyPatch(typeof(CP_Bioscan_Core), nameof(CP_Bioscan_Core.AddPlayersInScanToList))]
        [HarmonyPostfix]
        public static void AddPlayersInScanToList(pBioscanState state, List<PlayerAgent> playerAgents)
        {
            if (!SNetwork.SNet.IsMaster) return;

            if (state.playersInScan >= 1 && state.playerInScan1.GetPlayer(out var player))
            {
                PlayerStats stats;
                HostTracker.GetPlayer(player, out stats);

                stats.timeSpentInScan += Time.deltaTime;
            }
            if (state.playersInScan >= 2 && state.playerInScan2.GetPlayer(out player))
            {
                PlayerStats stats;
                HostTracker.GetPlayer(player, out stats);

                stats.timeSpentInScan += Time.deltaTime;
            }
            if (state.playersInScan >= 3 && state.playerInScan3.GetPlayer(out player))
            {
                PlayerStats stats;
                HostTracker.GetPlayer(player, out stats);

                stats.timeSpentInScan += Time.deltaTime;
            }
            if (state.playersInScan >= 4 && state.playerInScan4.GetPlayer(out player))
            {
                PlayerStats stats;
                HostTracker.GetPlayer(player, out stats);

                stats.timeSpentInScan += Time.deltaTime;
            }
        }

        #endregion

        #region Tracking checkpoints

            [HarmonyPatch(typeof(CheckpointManager), nameof(CheckpointManager.OnStateChange))]
        [HarmonyPostfix]
        public static void OnStateChange(pCheckpointState oldState, pCheckpointState newState, bool isRecall)
        {
            if (!SNet.IsMaster) return;
            if (oldState.isReloadingCheckpoint && isRecall && !SNet.MasterManagement.IsMigrating)
            {
                long timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                HostTracker.level.checkpoints.Add(timestamp);

                foreach (PlayerAgent player in PlayerManager.PlayerAgentsInLevel)
                {
                    PlayerStats stats;
                    HostTracker.GetPlayer(player, out stats);

                    HealthEvent healthEvent = new HealthEvent();
                    healthEvent.timestamp = timestamp;
                    healthEvent.value = player.Damage.Health;

                    stats.health.Add(healthEvent);

                    InfectionEvent infectionEvent = new InfectionEvent();
                    infectionEvent.timestamp = timestamp;
                    infectionEvent.value = player.Damage.Infection;

                    stats.infection.Add(infectionEvent);

                    if (stats.aliveStates.Last().type == AliveStateEvent.Type.Down)
                    {
                        AliveStateEvent aliveStateEvent = new AliveStateEvent();
                        aliveStateEvent.timestamp = timestamp;
                        aliveStateEvent.type = AliveStateEvent.Type.Checkpoint;
                        aliveStateEvent.playerID = null;

                        stats.aliveStates.Add(aliveStateEvent);
                    }

                    APILogger.Debug(Module.Name, $"{player.PlayerName} {player.Damage.Health}");
                }
            }
        }

        #endregion

        #region Tracking Packs (and infection)

        // TODO(randomuserhi): Figure out how to find out who gave disinfect to who
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ModifyInfection))]
        [HarmonyPostfix]
        public static void ModifyInfection(Dam_PlayerDamageBase __instance, pInfection data, bool sync, bool updatePageMap)
        {
            if (!SNet.IsMaster) return;

            PlayerStats stats;
            HostTracker.GetPlayer(__instance.Owner, out stats);

            long timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;

            InfectionEvent infectionEvent = new InfectionEvent();
            infectionEvent.timestamp = timestamp;
            infectionEvent.value = __instance.Infection;

            stats.infection.Add(infectionEvent);

            if (data.effect == pInfectionEffect.DisinfectionPack)
            {
                PackUse pack = new PackUse();
                pack.type = PackUse.Type.Disinfect;
                pack.timestamp = timestamp;
                pack.playerID = null;

                stats.packsUsed.Add(pack);

                if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"{stats.playerName} was disinfected.");
            }
        }

        // TODO(randomuserhi): Figure out how to find out who gave ammo to who
        [HarmonyPatch(typeof(PlayerBackpackManager), nameof(PlayerBackpackManager.ReceiveAmmoGive))]
        [HarmonyPostfix]
        public static void ReceiveAmmoGive(pAmmoGive data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            SNet_Player player;
            if (data.targetPlayer.TryGetPlayer(out player))
            {
                PlayerDataBlock block = GameDataBlockBase<PlayerDataBlock>.GetBlock(1u);
                float standardAmount = data.ammoStandardRel * (float)block.AmmoStandardResourcePackMaxCap;
                float specialAmount = data.ammoSpecialRel * (float)block.AmmoSpecialResourcePackMaxCap;
                float toolAmount = data.ammoClassRel * (float)block.AmmoClassResourcePackMaxCap;

                PlayerStats stats;
                HostTracker.GetPlayer(player, out stats);

                PackUse pack = new PackUse();
                pack.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                pack.playerID = null;
                if (standardAmount > 0 && specialAmount > 0)  
                    pack.type = PackUse.Type.Ammo;
                else if (toolAmount > 0)
                    pack.type = PackUse.Type.Tool;

                stats.packsUsed.Add(pack);

                if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"{stats.playerName} used {pack.type} pack.");
            }
        }

        private static float oldHealthHealing = 0;

        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveAddHealth))]
        [HarmonyPrefix]
        public static void Prefix_ReceiveAddHealth(Dam_PlayerDamageBase __instance)
        {
            if (!SNetwork.SNet.IsMaster) return;

            oldHealthHealing = __instance.Health;
        }

        private static PlayerAgent? sourcePackUser = null;

        [HarmonyPatch(typeof(ResourcePackFirstPerson), nameof(ResourcePackFirstPerson.ApplyPackBot))]
        [HarmonyPrefix]
        public static void ApplyPackBot(PlayerAgent ownerAgent, PlayerAgent receiverAgent, ItemEquippable resourceItem)
        {
            if (!SNetwork.SNet.IsMaster) return;

            switch (resourceItem.ItemDataBlock.persistentID)
            {
                case 102u:
                    sourcePackUser = ownerAgent;
                    break;
            }
        }

        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveAddHealth))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveAddHealth(Dam_PlayerDamageBase __instance, pAddHealthData data)
        {
            if (!SNetwork.SNet.IsMaster) return;

            PlayerStats self;
            HostTracker.GetPlayer(__instance.Owner, out self);

            float healing = __instance.Health - oldHealthHealing;
            if (healing > 0)
            {
                Agent? a = null;
                if (sourcePackUser == null)
                    data.source.TryGet(out a);
                else
                    a = sourcePackUser;

                if (a != null)
                {
                    PlayerAgent? p = a.TryCast<PlayerAgent>();
                    if (p != null)
                    {
                        PlayerStats source;
                        HostTracker.GetPlayer(p, out source);

                        PackUse pack = new PackUse();
                        pack.type = PackUse.Type.Health;
                        pack.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                        pack.playerID = source.playerID;

                        self.packsUsed.Add(pack);

                        if (ConfigManager.Debug)
                            APILogger.Debug(Module.Name, $"{self.playerName} was healed by {source.playerName}");
                    }
                }
            }

            long timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;

            HealthEvent healthEvent = new HealthEvent();
            healthEvent.timestamp = timestamp;
            healthEvent.value = __instance.Health;

            self.health.Add(healthEvent);

            sourcePackUser = null;
        }

        #endregion

        #region Tracking revives

        [HarmonyPatch(typeof(AgentReplicatedActions), nameof(AgentReplicatedActions.DoPlayerRevive))]
        [HarmonyPostfix]
        public static void DoPlayerRevive(pPlayerReviveAction data)
        {
            if (data.TargetPlayer.TryGet(out PlayerAgent t) && !t.Alive)
            {
                if (data.SourcePlayer.TryGet(out PlayerAgent s))
                {
                    PlayerStats target;
                    HostTracker.GetPlayer(t, out target);
                    PlayerStats source;
                    HostTracker.GetPlayer(s, out source);

                    long timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;

                    AliveStateEvent aliveStateEvent = new AliveStateEvent();
                    aliveStateEvent.timestamp = timestamp;
                    aliveStateEvent.type = AliveStateEvent.Type.Revive;
                    aliveStateEvent.playerID = source.playerID;

                    target.aliveStates.Add(aliveStateEvent);

                    HealthEvent healthEvent = new HealthEvent();
                    healthEvent.timestamp = timestamp;
                    healthEvent.value = 5;

                    target.health.Add(healthEvent);

                    if (ConfigManager.Debug)
                        APILogger.Debug(Module.Name, $"{target.playerName} was revived by {source.playerName}");
                }
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"Unable to get source player, this should not happen.");
            }
        }

        #endregion

        #region Tracking Health

        [HarmonyPatch(typeof(Dam_SyncedDamageBase), nameof(Dam_SyncedDamageBase.RegisterDamage))]
        [HarmonyPostfix]
        public static void RegisterDamage(Dam_SyncedDamageBase __instance)
        {
            Dam_PlayerDamageBase? player = __instance.TryCast<Dam_PlayerDamageBase>();
            if (player == null) return;

            PlayerStats stats;
            HostTracker.GetPlayer(player.Owner, out stats);

            long timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;

            HealthEvent healthEvent = new HealthEvent();
            healthEvent.timestamp = timestamp;
            healthEvent.value = __instance.Health;

            stats.health.Add(healthEvent);

            if (healthEvent.value <= 0 && (stats.aliveStates.Count == 0 || stats.aliveStates.Last().type != AliveStateEvent.Type.Down))
            {
                AliveStateEvent aliveStateEvent = new AliveStateEvent();
                aliveStateEvent.timestamp = timestamp;
                aliveStateEvent.type = AliveStateEvent.Type.Down;
                aliveStateEvent.playerID = null;

                stats.aliveStates.Add(aliveStateEvent);
            }
        }

        #endregion

        #region Tracking dodges

        // Shooter projectiles
        private static bool wasTargeting = false;
        private static ulong player = 0;
        [HarmonyPatch(typeof(ProjectileTargeting), nameof(ProjectileTargeting.Update))]
        [HarmonyPrefix]
        public static void Prefix_Update(ProjectileTargeting __instance)
        {
            if (!SNetwork.SNet.IsMaster) return;

            int instanceID = __instance.gameObject.GetInstanceID();

            if (projectileOwners.ContainsKey(instanceID))
            {
                wasTargeting = false;
                if (__instance.m_isTargeting && __instance.m_playerTarget != null)
                {
                    wasTargeting = true;
                    player = __instance.m_playerTarget.Owner.Lookup;
                }
            }
        }
        [HarmonyPatch(typeof(ProjectileTargeting), nameof(ProjectileTargeting.Update))]
        [HarmonyPostfix]
        public static void Postfix_Update(ProjectileTargeting __instance)
        {
            if (!SNetwork.SNet.IsMaster) return;

            int instanceID = __instance.gameObject.GetInstanceID();

            if (projectileOwners.ContainsKey(instanceID))
            {
                if (!__instance.m_isTargeting && wasTargeting)
                {
                    PlayerAgent target = __instance.m_playerTarget;
                    if (__instance.m_playerTarget != null && target.Owner.Lookup == player)
                    {
                        PlayerStats stats;
                        HostTracker.GetPlayer(target, out stats);

                        EnemyData e;
                        HostTracker.GetEnemyData(projectileOwners[instanceID], out e);

                        DodgeEvent dodgeEvent = new DodgeEvent();
                        dodgeEvent.type = DodgeEvent.Type.Projectile;
                        dodgeEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                        dodgeEvent.enemyInstanceID = e.instanceID;

                        stats.dodges.Add(dodgeEvent);

                        if (ConfigManager.Debug)
                            APILogger.Debug(Module.Name, $"{__instance.m_playerTarget.PlayerName} Dodged projectile from {e.instanceID}");
                    }
                }
            }
        }

        // Tongues
        [HarmonyPatch(typeof(MovingEnemyTentacleBase), nameof(MovingEnemyTentacleBase.OnAttackIsOut))]
        [HarmonyPrefix]
        public static void OnAttackIsOut(MovingEnemyTentacleBase __instance)
        {
            if (!SNetwork.SNet.IsMaster) return;

            PlayerAgent? target = __instance.PlayerTarget;

            bool flag = __instance.CheckTargetInAttackTunnel();
            if (SNet.IsMaster && target != null && target.Damage.IsSetup)
            {
                bool flag2;
                if (__instance.m_owner.EnemyBalancingData.UseTentacleTunnelCheck)
                {
                    flag2 = flag;
                }
                else
                {
                    Vector3 tipPos = __instance.GetTipPos();
                    flag2 = (target.TentacleTarget.position - tipPos).magnitude < __instance.m_owner.EnemyBalancingData.TentacleAttackDamageRadiusIfNoTunnelCheck;
                }
                if (!flag2)
                {
                    PlayerStats stats;
                    HostTracker.GetPlayer(target, out stats);

                    EnemyData e;
                    HostTracker.GetEnemyData(__instance.m_owner, out e);

                    DodgeEvent dodgeEvent = new DodgeEvent();
                    dodgeEvent.type = DodgeEvent.Type.Tongue;
                    dodgeEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                    dodgeEvent.enemyInstanceID = e.instanceID;

                    stats.dodges.Add(dodgeEvent);
                    
                    if (ConfigManager.Debug)
                        APILogger.Debug(Module.Name, $"{target.PlayerName} dodged tongue from [{dodgeEvent.enemyInstanceID}]");
                }
            }
        }

        #endregion
    }
}
