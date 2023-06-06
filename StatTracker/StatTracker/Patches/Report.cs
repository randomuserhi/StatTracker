using API;
using Dissonance;
using GameData;
using Globals;
using HarmonyLib;
using Il2CppInterop.Runtime.InteropTypes.Arrays;
using Il2CppSystem.Text;
using Player;
using SNetwork;
using System.Security.Cryptography.X509Certificates;
using UnityEngine;
using UnityEngine.UIElements;
using static Il2CppSystem.Globalization.CultureInfo;

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

        private static string Serialize(List<InfectionEvent> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (InfectionEvent e in track)
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

        private static string Serialize(List<long> track)
        {
            StringBuilder json = new StringBuilder();

            string seperator = string.Empty;
            foreach (long value in track)
            {
                json.Append($"{seperator}{value}");
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
                json.Append($"\"level\":{{\"name\":\"{shortName}\",\"checkpoints\":[{Serialize(HostTracker.level.checkpoints)}]}},");

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
                    json.Append($"\"timeSpentInScan\":{Mathf.RoundToInt(player.timeSpentInScan * 1000)},");
                    json.Append($"\"gears\":{{{Serialize(player.gears)}}},");
                    json.Append($"\"damageTaken\":[{Serialize(player.damageTaken)}],");
                    json.Append($"\"dodges\":[{Serialize(player.dodges)}],");
                    json.Append($"\"aliveStates\":[{Serialize(player.aliveStates)}],");
                    json.Append($"\"packsUsed\":[{Serialize(player.packsUsed)}],");
                    json.Append($"\"health\":[{Serialize(player.health)}],");
                    json.Append($"\"infection\":[{Serialize(player.infection)}]");
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

            // Temporarily only let host save report
            if (SNetwork.SNet.IsMaster)
            {
                string msg = json.ToString();
                try
                {
                    File.WriteAllText(Path.Join(ConfigManager.ReportPath, $"{shortName}-{DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss")}.json"), msg);
                }
                catch (Exception)
                {
                    APILogger.Debug(Module.Name, $"Failed to save file to {ConfigManager.ReportPath}");
                }
                // TODO send to clients
                SNet_ChannelType channelType = SNet_ChannelType.SessionOrderCritical;
                SNet.GetSendSettings(ref channelType, out _, out SNet_SendQuality quality, out int channel);
                Il2CppSystem.Collections.Generic.List<SNet_Player> il2cppList = new(PlayerManager.PlayerAgentsInLevel.Count);
                for (int i = 0; i < PlayerManager.PlayerAgentsInLevel.Count; i++)
                {
                    if (!PlayerManager.PlayerAgentsInLevel[i].IsLocallyOwned && !PlayerManager.PlayerAgentsInLevel[i].Owner.IsBot)
                    {
                        il2cppList.Add(PlayerManager.PlayerAgentsInLevel[i].Owner);
                        APILogger.Debug(Module.Name, $"[Networking] Sending report to {PlayerManager.PlayerAgentsInLevel[i].PlayerName}");
                    }
                }
                byte[] msgData = System.Text.Encoding.UTF8.GetBytes(msg);
                APILogger.Debug(Module.Name, $"[Networking] Report is {msgData.Length} bytes large.");

                byte[] header = new byte[sizeof(ushort) + sizeof(uint) + 1 + sizeof(int)];
                Array.Copy(BitConverter.GetBytes(repKey), 0, header, 0, sizeof(ushort));
                Array.Copy(BitConverter.GetBytes(magickey), 0, header, sizeof(ushort), sizeof(uint));
                header[sizeof(ushort) + sizeof(uint)] = msgtype;
                Array.Copy(BitConverter.GetBytes(msgData.Length), 0, header, sizeof(ushort) + sizeof(uint) + 1, sizeof(int));

                byte[] full = new byte[header.Length + msgData.Length];
                Array.Copy(header, 0, full, 0, header.Length);
                Array.Copy(msgData, 0, full, header.Length, msgData.Length);

                SNet.Core.SendBytes(full, quality, channel, il2cppList);
            }
        }

        private static byte msgtype = 115;
        private static uint magickey = 1203129;
        private static ushort repKey = 0xFFFC; // make sure doesnt clash with GTFO-API

        // https://github.com/Kasuromi/GTFO-API/blob/main/GTFO-API/Patches/SNet_Replication_Patches.cs#L56
        [HarmonyPatch(typeof(SNet_Replication), nameof(SNet_Replication.RecieveBytes))]
        [HarmonyWrapSafe]
        [HarmonyPrefix]
        public static bool RecieveBytes_Prefix(Il2CppStructArray<byte> bytes, uint size, ulong messagerID)
        {
            if (size < 12) return true;

            // The implicit constructor duplicates the memory, so copying it once and using that is best
            byte[] _bytesCpy = bytes;

            ushort replicatorKey = BitConverter.ToUInt16(_bytesCpy, 0);
            if (repKey == replicatorKey)
            {
                uint receivedMagicKey = BitConverter.ToUInt32(bytes, sizeof(ushort));
                if (receivedMagicKey != magickey) 
                {
                    APILogger.Debug(Module.Name, $"[Networking] Magic key is incorrect.");
                    return true;
                }

                byte receivedMsgtype = bytes[sizeof(ushort) + sizeof(uint)];
                if (receivedMsgtype != msgtype)
                {
                    APILogger.Debug(Module.Name, $"[Networking] msg type is incorrect. {receivedMsgtype} {msgtype}");
                    return true;
                }


                int msgsize = BitConverter.ToInt32(bytes, sizeof(ushort) + sizeof(int) + 1);
                string report = System.Text.Encoding.UTF8.GetString(bytes, sizeof(ushort) + sizeof(uint) + 1 + sizeof(int), msgsize);

                APILogger.Debug(Module.Name, $"[Networking] Report received: {msgsize} bytes");

                pActiveExpedition expedition = RundownManager.GetActiveExpeditionData();
                RundownDataBlock data = GameDataBlockBase<RundownDataBlock>.GetBlock(Global.RundownIdToLoad);
                string shortName = data.GetExpeditionData(expedition.tier, expedition.expeditionIndex).GetShortName(expedition.expeditionIndex);
                File.WriteAllText(Path.Join(ConfigManager.ReportPath, $"{shortName}-{DateTime.Now.ToString("yyyy-MM-dd-HH-mm-ss")}.json"), report);

                return false;
            }
            return true;
        }
    }
}
