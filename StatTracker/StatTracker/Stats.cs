using Il2CppSystem.Data;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace StatTracker
{
    public class StatTrack<TKey, TValue> where TKey: notnull
    {
        private Dictionary<TKey, TValue> tracker = new Dictionary<TKey, TValue>();

        public Func<TKey, TValue> createDefault = delegate { return default!; };

        public StatTrack() { }
        public StatTrack(Func<TKey, TValue> createDefault)
        {
            this.createDefault = createDefault;
        }

        public IEnumerable<TKey> Keys { get { return tracker.Keys; } }
        public IEnumerable<TValue> Values { get { return tracker.Values; } }

        public TValue this[TKey index]
        {
            get {
                if (!tracker.ContainsKey(index))
                    tracker.Add(index, createDefault(index));
                return tracker[index];
            }
            set {
                if (tracker.ContainsKey(index))
                    tracker[index] = value;
                else tracker.Add(index, value); 
            }
        }

        public TValue Set(TKey key)
        {
            if (!tracker.ContainsKey(key))
                tracker.Add(key, createDefault(key));
            return tracker[key];
        }
    }

    public class LevelData
    {
        public List<long> checkpoints = new List<long>();
    }

    public class LimbDamageData
    {
        public readonly ulong playerID;
        public StatTrack<string, float> gear = new StatTrack<string, float>(delegate (string name) { return 0; });

        public LimbDamageData(ulong playerID)
        {
            this.playerID = playerID;
        }
    }

    public class LimbData
    {
        public readonly string name;

        public ulong? breaker = null;
        public string? breakerGear = null;

        public StatTrack<ulong, LimbDamageData> gears = new StatTrack<ulong, LimbDamageData>(delegate (ulong id) { return new LimbDamageData(id); });

        public LimbData(string name)
        {
            this.name = name;
        }
    }

    public class EnemyData
    {
        public readonly int instanceID;
        public readonly string enemyType;

        public bool alive = true;
        public long? timestamp = null;
        public ulong? killer = null;
        public string? killerGear = null;
        public int? mineInstance = null;

        public float health;
        public float healthMax;

        public StatTrack<string, LimbData> limbData = new StatTrack<string, LimbData>(delegate (string name) { return new LimbData(name); });
    
        public EnemyData(int instanceID, string enemyType)
        {
            this.instanceID = instanceID;
            this.enemyType = enemyType;
        }
    }

    public class GearData
    {
        public readonly string name;
        public float damage;
        public StatTrack<string, int> enemiesKilled = new StatTrack<string, int>(delegate { return 0; });
    
        public GearData(string name)
        {
            this.name = name;
        }
    }

    public struct DamageEvent
    {
        public enum Type
        {
            FallDamage,
            Tongue,
            Melee,
            ShooterPellet,
            Mine,
            PlayerBullet,
            PlayerExplosive
        }

        public Type type;
        public long timestamp;
        public float damage;

        public int? enemyInstanceID;

        public ulong playerID;
        public string gearName; // name of gear if player did damage to you (sentry, gun name, mine deployer, consumable mine etc...) 
    }

    public struct DodgeEvent
    {
        public enum Type
        {
            Tongue,
            Projectile
        }

        public Type type;
        public long timestamp;

        public int enemyInstanceID;
    }

    public struct HealthEvent
    {
        public long timestamp;
        public float value;
    }

    public struct InfectionEvent
    {
        public long timestamp;
        public float value;
    }

    public struct AliveStateEvent
    {
        public enum Type
        {
            Down,
            Revive,
            Checkpoint
        }

        public Type type;
        public long timestamp;

        // Player that revived you
        public ulong? playerID;
    }

    public struct PackUse
    {
        public enum Type
        {
            Health,
            Ammo,
            Tool,
            Disinfect
        }

        public Type type;
        public long timestamp;
        public ulong? playerID;
    }

    public class PlayerStats
    {
        // Player the stats belong to
        public readonly ulong playerID;
        public readonly string playerName = "";
        public readonly bool isBot = false;
        public float healthMax;

        public float timeSpentInScan = 0;

        public PlayerStats(ulong id, string name, bool isBot)
        {
            playerID = id;
            playerName = name;
            this.isBot = isBot;
        }

        // Dictionary of "gear Public Name" => damage the gear did
        // => includes melee damage
        public StatTrack<string, GearData> gears = new StatTrack<string, GearData>(delegate (string name) { return new GearData(name); });

        // List of damage events
        public List<DamageEvent> damageTaken = new List<DamageEvent>();

        // List of dodge events
        public List<DodgeEvent> dodges = new List<DodgeEvent>();

        // List of infection events
        public List<InfectionEvent> infection = new List<InfectionEvent>();

        // List of health events
        public List<HealthEvent> health = new List<HealthEvent>();

        // List of down and revive events
        public List<AliveStateEvent> aliveStates = new List<AliveStateEvent>();

        // Dictionary of "Pack Public Name" => number of times used on this player
        public List<PackUse> packsUsed = new List<PackUse>();

        // TODO(randomuserhi)
        // => snatchers dodged
        // => players saved from tongues
    }
}
