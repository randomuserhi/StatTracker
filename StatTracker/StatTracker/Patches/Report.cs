using API;
using GameData;
using Globals;
using HarmonyLib;
using Il2CppSystem.Text;
using Player;
using System.Security.Cryptography.X509Certificates;

// TODO(randomuserhi): Fix exit expedition not creating save file

namespace StatTracker.Patches
{
    [HarmonyPatch]
    public static class Report
    {
        private static string Serialize(GearData gear)
        {
            StringBuilder json = new StringBuilder();

            json.Append($"\"name\":\"{gear.name}\",\"damage\":{gear.damage},\"enemiesKilled\":{{{Serialize(gear.enemiesKilled)}}}");

            return json.ToString();
        }

        private static string Serialize(StatTrack<string, GearData> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (string key in track.Keys)
            {
                json.Append($"{seperator}\"{key}\":{{{Serialize(track[key])}}}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(StatTrack<string, int> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (string key in track.Keys)
            {
                json.Append($"{seperator}\"{key}\":{track[key]}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(List<DamageEvent> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (DamageEvent e in track)
            {
                json.Append($"{seperator}{{\"timestamp\":{e.timestamp},\"type\":\"{e.type}\",\"damage\":{e.damage},");
                if (e.enemyInstanceID != null)
                    json.Append($"\"enemyInstanceID\":\"{e.enemyInstanceID.Value}\",");
                json.Append($"\"playerID\":\"{e.playerID}\",\"gearName\":\"{e.gearName}\"}}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(List<DodgeEvent> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (DodgeEvent e in track)
            {
                json.Append($"{seperator}{{\"timestamp\":{e.timestamp},\"type\":\"{e.type}\",\"enemyInstanceID\":\"{e.enemyInstanceID}\"}}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(List<AliveStateEvent> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (AliveStateEvent e in track)
            {
                json.Append($"{seperator}{{\"timestamp\":{e.timestamp},\"type\":\"{e.type}\"");
                if (e.playerID != null)
                    json.Append($",\"playerID\":\"{e.playerID.Value}\"");
                json.Append($"}}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(List<PackUse> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (PackUse e in track)
            {
                json.Append($"{seperator}{{\"timestamp\":{e.timestamp},\"type\":\"{e.type}\"");
                if (e.playerID != null)
                    json.Append($",\"playerID\":\"{e.playerID.Value}\"");
                json.Append($"}}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(List<HealthEvent> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (HealthEvent e in track)
            {
                json.Append($"{seperator}{{\"timestamp\":{e.timestamp},\"value\":\"{e.value}\"");
                json.Append($"}}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(EnemyData enemy)
        {
            StringBuilder json = new StringBuilder();

            json.Append($"\"instanceID\":\"{enemy.instanceID}\",\"type\":\"{enemy.enemyType}\",\"alive\":{enemy.alive.ToString().ToLower()},");
            if (enemy.killer != null && enemy.killerGear != null && enemy.timestamp != null)
            {
                json.Append($"\"timestamp\":{enemy.timestamp.Value},\"killer\":\"{enemy.killer.Value}\",\"killerGear\":\"{enemy.killerGear}\",");
                if (enemy.mineInstance != null)
                {
                    json.Append($"\"mineInstance\":\"{enemy.mineInstance.Value}\",");
                }
            }
            json.Append($"\"health\":{enemy.health},\"healthMax\":{enemy.healthMax},\"limbData\":{{{Serialize(enemy.limbData)}}}");

            return json.ToString();
        }

        private static string Serialize(LimbData limb)
        {
            StringBuilder json = new StringBuilder();

            json.Append($"\"name\":\"{limb.name}\",");
            if (limb.breaker != null && limb.breakerGear != null)
            {
                json.Append($"\"breaker\":\"{limb.breaker.Value}\",\"breakerGear\":\"{limb.breakerGear}\",");
            }
            json.Append($"\"gears\":{{{Serialize(limb.gears)}}}");

            return json.ToString();
        }

        private static string Serialize(StatTrack<ulong, LimbDamageData> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (ulong key in track.Keys)
            {
                json.Append($"{seperator}\"{key}\":{{{Serialize(track[key])}}}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(StatTrack<string, float> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (string key in track.Keys)
            {
                json.Append($"{seperator}\"{key}\":{track[key]}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(LimbDamageData limb)
        {
            StringBuilder json = new StringBuilder();

            json.Append($"\"playerID\":\"{limb.playerID}\",\"gear\":{{{Serialize(limb.gear)}}}");

            return json.ToString();
        }

        private static string Serialize(StatTrack<string, LimbData> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (string key in track.Keys)
            {
                json.Append($"{seperator}\"{key}\":{{{Serialize(track[key])}}}");
                seperator = ",";
            }

            return json.ToString();
        }

        private static string Serialize(StatTrack<string, LimbDamageData> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (string key in track.Keys)
            {
                json.Append($"{seperator}\"{key}\":{{{Serialize(track[key])}}}");
                seperator = ",";
            }

            return json.ToString();
        }

        [HarmonyPatch(typeof(RundownManager), nameof(RundownManager.EndGameSession))]
        [HarmonyPrefix]
        public static void EndGameSession()
        {
            APILogger.Debug(Module.Name, $"Expedition ended, saving report.");

            StringBuilder json = new StringBuilder();

            string[] Tiers = new string[] {
                    "-",
                    "A",
                    "B",
                    "C",
                    "D",
                    "E"
                };
            pActiveExpedition expedition = RundownManager.GetActiveExpeditionData();
            RundownDataBlock data = GameDataBlockBase<RundownDataBlock>.GetBlock(Global.RundownIdToLoad);
            string shortName = data.GetExpeditionData(expedition.tier, expedition.expeditionIndex).GetShortName(expedition.expeditionIndex);

            json.Append($"[");
            if (SNetwork.SNet.IsMaster)
            {
                json.Append($"{{\"reportType\": \"HOST\",\"report\":{{");

                json.Append($"\"timetaken\":{((DateTimeOffset)DateTime.Now).ToUnixTimeMilliseconds() - HostTracker.startTime},");
                json.Append($"\"level\":{{\"name\":\"{shortName}\"}},");

                json.Append($"\"active\":[");
                string seperator = string.Empty;
                foreach (PlayerAgent p in PlayerManager.PlayerAgentsInLevel)
                {
                    PlayerStats player;
                    HostTracker.GetPlayer(p, out player);
                    json.Append($"{seperator}{{\"playerID\":\"{player.playerID}\",");
                    json.Append($"\"name\":\"{player.playerName}\",\"isBot\":{player.isBot.ToString().ToLower()}");
                    json.Append($"}}");
                    seperator = ",";
                }
                json.Append($"]");

                json.Append($",\"players\":[");
                seperator = string.Empty;
                foreach (PlayerStats player in HostTracker.players.Values)
                {
                    json.Append($"{seperator}{{\"playerID\":\"{player.playerID}\",");
                    json.Append($"\"name\":\"{player.playerName}\",\"isBot\":{player.isBot.ToString().ToLower()},");
                    json.Append($"\"healthMax\":{player.healthMax},");
                    json.Append($"\"gears\":{{{Serialize(player.gears)}}},");
                    json.Append($"\"damageTaken\":[{Serialize(player.damageTaken)}],");
                    json.Append($"\"dodges\":[{Serialize(player.dodges)}],");
                    json.Append($"\"aliveStates\":[{Serialize(player.aliveStates)}],");
                    json.Append($"\"packsUsed\":[{Serialize(player.packsUsed)}],");
                    json.Append($"\"health\":[{Serialize(player.health)}]");
                    json.Append($"}}");
                    seperator = ",";
                }
                json.Append($"]");

                json.Append($",\"enemies\":{{");
                seperator = string.Empty;
                foreach (int id in HostTracker.enemyData.Keys)
                {
                    json.Append($"{seperator}\"{id}\":{{{Serialize(HostTracker.enemyData[id])}}}");
                    seperator = ",";
                }
                json.Append($"}}");

                json.Append("}}");
            }
            json.Append("]");
            // TODO(randomuserhi): add client report (reportType: "CLIENT") when host does not have mod

            // Temporarily only let host save report
            if (SNetwork.SNet.IsMaster)
            {
                //Directory.CreateDirectory(ConfigManager.ReportPath);
                File.WriteAllText(Path.Join(ConfigManager.ReportPath, $"{shortName}-{DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss")}.json"), json.ToString());
            }
        }
    }
}
