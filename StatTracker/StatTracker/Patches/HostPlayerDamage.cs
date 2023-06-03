using HarmonyLib;
using Agents;
using API;
using Player;
using Enemies;
using UnityEngine;
using SNetwork;

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
            else if (!SNet.IsMaster)
            {
                var agent = GameObject.FindObjectsOfType<EnemyAgent>();
                EnemyAgent closest = agent[0];
                float sqrDist = (closest.transform.position - data.position).sqrMagnitude; 
                for (int i = 1; i < agent.Count; ++i)
                {
                    float comparison = (agent[i].transform.position - data.position).sqrMagnitude;
                    if (comparison < sqrDist)
                    {
                        closest = agent[i];
                        sqrDist = comparison;
                    }
                }
                projectileOwners.Add(projectile.GetInstanceID(), closest);
            }
            else if (ConfigManager.Debug)
                APILogger.Debug(Module.Name, $"currentShooter was null, this should not happen.");

            return false;
        }

        [HarmonyPatch(typeof(ProjectileTargeting), nameof(ProjectileTargeting.OnDestroy))]
        [HarmonyPrefix]
        public static void OnDestroy(ProjectileTargeting __instance)
        {
            if (projectileOwners.Remove(__instance.gameObject.GetInstanceID()))
                APILogger.Debug(Module.Name, $"Projectile successfully removed.");
        }

        private static EnemyAgent? hitByShooter = null;

        [HarmonyPatch(typeof(ProjectileBase), nameof(ProjectileBase.Collision))]
        [HarmonyPrefix]
        public static void Prefix_Collision(ProjectileBase __instance)
        {
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

        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveFallDamage))]
        [HarmonyPrefix]
        public static void Prefix_ReceiveFallDamage(Dam_PlayerDamageBase __instance, pMiniDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveFallDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveFallDamage(Dam_PlayerDamageBase __instance, pMiniDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

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
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveTentacleAttackDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveTentacleAttackDamage(Dam_PlayerDamageBase __instance, pMediumDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

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
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveMeleeDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveMeleeDamage(Dam_PlayerDamageBase __instance, pFullDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

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
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveShooterProjectileDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveShooterProjectileDamage(Dam_PlayerDamageBase __instance, pMediumDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

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
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveBulletDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveBulletDamage(Dam_PlayerDamageBase __instance, pBulletDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

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
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

            oldHealth = __instance.Health;
        }
        [HarmonyPatch(typeof(Dam_PlayerDamageBase), nameof(Dam_PlayerDamageBase.ReceiveExplosionDamage))]
        [HarmonyPostfix]
        public static void Postfix_ReceiveExplosionDamage(Dam_PlayerDamageBase __instance, pExplosionDamageData data)
        {
            if (!SNetwork.SNet.IsMaster) return;
            if (!__instance.Owner.Alive || __instance.Health <= 0) return;

            PlayerStats stats;
            HostTracker.GetPlayer(__instance.Owner, out stats);

            float damage = oldHealth - __instance.Health;

            if (HostDamage.currentMine != null)
            {
                PlayerStats other;
                HostTracker.GetPlayer(HostDamage.currentMine.owner, out other);

                DamageEvent damageEvent = new DamageEvent();

                damageEvent.timestamp = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime;
                damageEvent.type = DamageEvent.Type.PlayerBullet;
                damageEvent.damage = damage;
                damageEvent.playerID = other.playerID;
                damageEvent.gearName = HostDamage.currentMine.name;

                stats.damageTaken.Add(damageEvent);

                if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"{__instance.Owner.PlayerName} took {damageEvent.damage} explosive damage from {other.playerName} [{damageEvent.gearName}].");
            }
        }
    }
}
