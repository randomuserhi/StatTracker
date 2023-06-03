﻿using API;
using HarmonyLib;
using Il2CppSystem.Text;

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
                json.Append($"\"playerID\":{e.playerID},\"gearName\":\"{e.gearName}\"}}");
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
            json.Append($"\"weapons\":{{{Serialize(limb.weapons)}}},\"tools\":{{{Serialize(limb.tools)}}}");

            return json.ToString();
        }

        private static string Serialize(LimbDamageData limb)
        {
            StringBuilder json = new StringBuilder();

            json.Append($"\"name\":\"{limb.name}\",\"damage\":{limb.damage}");

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

        [HarmonyPatch(typeof(RundownManager), nameof(RundownManager.OnExpeditionEnded))]
        [HarmonyPrefix]
        public static void OnExpeditionEnd(ExpeditionEndState endState)
        {
            APILogger.Debug(Module.Name, $"Expedition ended, saving report.");

            StringBuilder json = new StringBuilder();

            json.Append($"[");
            if (SNetwork.SNet.IsMaster)
            {
                json.Append($"{{\"reportType\": \"HOST\",\"report\":{{");

                json.Append($"\"players\":[");
                string seperator = string.Empty;
                foreach (PlayerStats player in HostTracker.players.Values)
                {
                    json.Append($"{seperator}{{\"playerID\":{player.playerID},\"name\":\"{player.playerName}\",\"isBot\":{player.isBot.ToString().ToLower()},\"healthMax\":{player.healthMax},\"weapons\":{{{Serialize(player.weapons)}}},\"tools\":{{{Serialize(player.tools)}}},\"damageTaken\":[{Serialize(player.damageTaken)}],\"packsUsed\":{{{Serialize(player.packsUsed)}}}}}");
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
                File.WriteAllText(Path.Join(ConfigManager.ReportPath, $"report-{DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss")}.json"), json.ToString());
            }
        }
    }
}