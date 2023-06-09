﻿using API;
using Agents;
using Enemies;
using Player;
using UnityEngine;
using Gear;

#if CLIENT

namespace StatTracker
{
    // refers to data recorded locally which is just an estimate and lacks information, like sentry damage etc...

    // TODO(randomuserhi): locally track EnemyData - enemies you hit and where => can semi-track limb breaks similar to enemy kills with an estimate
    public class ClientTracker
    {
        public class Enemy
        {
            public readonly int instanceID;

            public float health;
            public float maxHealth;

            public Enemy(int instanceID)
            {
                this.instanceID = instanceID;
            }
        }

        public static Dictionary<ulong, PlayerStats> players = new Dictionary<ulong, PlayerStats>();
        public static Dictionary<int, Enemy> enemies = new Dictionary<int, Enemy>();

        public static void OnRundownStart()
        {
            if (ConfigManager.Debug) APILogger.Debug(Module.Name, "OnRundownStart (client) => Reset internal dictionaries.");

            enemies.Clear();
            players.Clear();
        }

        public static bool GetPlayer(PlayerAgent player, out PlayerStats stats)
        {
            return GetPlayer(player.Owner, out stats);
        }

        public static bool GetPlayer(SNetwork.SNet_Player player, out PlayerStats stats)
        {
            ulong id = player.Lookup;
            if (!players.ContainsKey(id))
            {
                stats = new PlayerStats(id, player.NickName, player.IsBot);
                PlayerAgent? p = player.PlayerAgent.TryCast<PlayerAgent>();
                if (p != null)
                    stats.healthMax = p.Damage.HealthMax;
                else if (ConfigManager.Debug)
                    APILogger.Debug(Module.Name, $"No player agent found, this should not happen.");
                PlayerBackpack backpack = PlayerBackpackManager.GetBackpack(player);
                stats.weapons.Set(backpack.Slots[(int)InventorySlot.GearStandard].Instance.PublicName);
                stats.weapons.Set(backpack.Slots[(int)InventorySlot.GearSpecial].Instance.PublicName);
                stats.weapons.Set(backpack.Slots[(int)InventorySlot.GearMelee].Instance.PublicName);
                stats.tools.Set(backpack.Slots[(int)InventorySlot.GearClass].Instance.PublicName);
                players.Add(id, stats);
                return false;
            }

            stats = players[id];
            return true;
        }

        public static bool GetEnemy(int instanceID, out Enemy enemy)
        {
            if (!enemies.ContainsKey(instanceID))
            {
                enemy = new Enemy(instanceID);
                enemies.Add(instanceID, enemy);
                return false;
            }

            enemy = enemies[instanceID];
            return true;
        }
    }
}

#endif