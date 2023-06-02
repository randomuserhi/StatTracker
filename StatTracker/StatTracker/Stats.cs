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
    }

    public class LimbDamageData
    {
        public readonly string name;
        public float damage;

        public LimbDamageData(string name)
        {
            this.name = name;
        }
    }

    public class LimbData
    {
        public readonly string name;

        public ulong? breaker = null;
        public string? breakerGear = null;

        // Dictionary of "Weapon Public Name" => damage the weapon did
        // => includes melee damage
        public StatTrack<string, LimbDamageData> weapons = new StatTrack<string, LimbDamageData>(delegate (string name) { return new LimbDamageData(name); });

        // Dictionary of "Tool Public Name" => damage the tool did
        // => includes consumables as tool (consumable mine should show up here as well)
        public StatTrack<string, LimbDamageData> tools = new StatTrack<string, LimbDamageData>(delegate (string name) { return new LimbDamageData(name); });

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
        public ulong? killer = null;
        public string? killerGear = null;

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
            PlayerBullet
        }

        public Type type;
        public long timestamp;
        public float damage;

        public int? enemyInstanceID;

        public ulong playerID;
        public string gearName; // name of gear if player did damage to you (sentry, gun name, mine deployer, consumable mine etc...) 
    }

    public class PlayerStats
    {
        // Player the stats belong to
        public readonly ulong playerID;
        public readonly string playerName = "";
        public readonly bool isBot = false;

        public PlayerStats(ulong id, string name, bool isBot)
        {
            playerID = id;
            playerName = name;
            this.isBot = isBot;
        }

        // Dictionary of "Weapon Public Name" => damage the weapon did
        // => includes melee damage
        public StatTrack<string, GearData> weapons = new StatTrack<string, GearData>(delegate (string name) { return new GearData(name); });

        // Dictionary of "Tool Public Name" => damage the tool did
        // => includes consumables as tool (consumable mine should show up here as well)
        public StatTrack<string, GearData> tools = new StatTrack<string, GearData>(delegate (string name) { return new GearData(name); });

        // List of damage events
        public List<DamageEvent> damageTaken = new List<DamageEvent>();

        // TODO(randomuserhi)
        // Dictionary of "Pack Public Name" => number of times used on this player
        public StatTrack<string, int> packsUsed = new StatTrack<string, int>(delegate { return 0; });

        // TODO(randomuserhi)
        // => deaths and when and who killed you
        // => number of revives
        // => number of deaths
        // => enemy tongues dodged
        // => snatches dodged
        // => players saved from tongues
        // => damage dealt to other players (and who)
        // => packs given to other players (and who)
    }
}
