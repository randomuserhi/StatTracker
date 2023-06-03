using API;
using Player;
using Enemies;
using StatTracker.Patches;

namespace StatTracker
{
    // refers to data recorded by host which is 100% accurate and has full information
    public class HostTracker
    {
        public static long startTime = 0;

        public static Dictionary<ulong, PlayerStats> players = new Dictionary<ulong, PlayerStats>();
        
        // Dictionary of "Enemy public name" => Dictionary of "instanceID" => stats on damage dealt to the enemy
        // => Stores a catalogue of all enemies and how much damage you contributed to each individual
        // => Calculate damage per group since its grouped by enemy type, but this is useful in the case
        //    of like 2 tanks, and you want to know who contributed the most damage to one of the tanks
        // => Stores damage dealt by each gun / tool to each limb
        // => Stores number of damaging-bullets hit on each limb for each enemy (refer to below)
        // => Stores number of dud-bullets hit on each limb for each enemy => shotgun pellets may do 0 damage since they hit an enemy
        //                                                                    thats already dead, thus counting as a dud hit
        public static Dictionary<int, EnemyData> enemyData = new Dictionary<int, EnemyData>();

        public static void OnRundownStart()
        {
            if (ConfigManager.Debug) APILogger.Debug(Module.Name, "OnRundownStart (host) => Reset internal dictionaries.");

            startTime = ((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds();
            players.Clear();

            HostDamage.mines.Clear();
            HostPlayerDamage.projectileOwners.Clear();
        }

        public static bool GetEnemyData(EnemyAgent enemy, out EnemyData data)
        {
            int instanceID = enemy.GetInstanceID();
            if (!enemyData.ContainsKey(instanceID))
            {
                data = new EnemyData(instanceID, enemy.EnemyData.name);
                data.healthMax = enemy.Damage.HealthMax;
                data.health = enemy.Damage.Health;
                enemyData.Add(instanceID, data);
                return false;
            }

            data = enemyData[instanceID];
            return true;
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
                stats.gears.Set(backpack.Slots[(int)InventorySlot.GearStandard].Instance.PublicName);
                stats.gears.Set(backpack.Slots[(int)InventorySlot.GearSpecial].Instance.PublicName);
                stats.gears.Set(backpack.Slots[(int)InventorySlot.GearMelee].Instance.PublicName);
                stats.gears.Set(backpack.Slots[(int)InventorySlot.GearClass].Instance.PublicName);
                players.Add(id, stats);
                return false;
            }

            stats = players[id];
            return true;
        }
    }
}
