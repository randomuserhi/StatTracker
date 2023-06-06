using BepInEx.Configuration;
using BepInEx;

namespace StatTracker
{
    public static class ConfigManager
    {
        static ConfigManager()
        {
            string text = Path.Combine(Paths.ConfigPath, $"{Module.Name}.cfg");
            ConfigFile configFile = new ConfigFile(text, true);

            debug = configFile.Bind(
                "Debug",
                "enable",
                false,
                "Enables debug messages when true.");

            lingerTime = configFile.Bind(
                "Settings",
                "lingerTime",
                500,
                "Time projectiles linger post removal.");

            reportPath = configFile.Bind(
                "Reports",
                "path",
                "",
                "Location to save expedition reports.");
        }

        public static bool Debug
        {
            get { return debug.Value; }
            set { debug.Value = value; }
        }

        public static string ReportPath
        {
            get { return reportPath.Value; }
            set { reportPath.Value = value; }
        }

        public static int LingerTime
        {
            get { return lingerTime.Value; }
            set { lingerTime.Value = value; }
        }

        private static ConfigEntry<bool> debug;
        private static ConfigEntry<string> reportPath;
        private static ConfigEntry<int> lingerTime;
    }
}