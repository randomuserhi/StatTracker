interface GearData
{
    playerID: string;
    name: string;
    damage: number;
    enemiesKilled: Record<string, number>;
}

interface AliveState
{
    timestamp: number;
    type: string;
    playerID?: string;
}

interface DodgeEvent
{
    timestamp: number;
    type: string;
    enemyInstanceID: string;
}

interface PackUse
{
    timestamp: number;
    type: string;
    playerID?: string;
}

interface DamageEvent
{
    timestamp: number;
    type: string;
    damage: number;

    enemyInstanceID?: string;
    
    playerID: string;
    gearName: string;
}

interface Health
{
    timestamp: number;
    value: number;
}

interface Player
{
    playerID: string;
    name: string;
    isBot: boolean;
}

interface PlayerData extends Player
{
    healthMax: number;
    health: Health[];
    
    packsUsed: PackUse[];
    dodges: DodgeEvent[];
    aliveStates: AliveState[];
    damageTaken: DamageEvent[];
    
    gears: Record<string, GearData>;
}

interface LimbDamageData
{
    playerID: string;
    gear: Record<string, number>;
}

interface LimbData
{
    name: string;

    breaker?: string;
    breakerGear?: string;

    gears: Record<string, LimbDamageData>;
}

interface Enemy
{
    instanceID: string;
    type: string;
    alive: boolean;
    
    health: number;
    healthMax: number;

    timestamp?: number;
    killer?: string;
    killerGear?: string;
    mineInstance?: string;
    
    limbData: Record<string, LimbData>;
}

interface JSONReport
{
    active: Player[];
    players: PlayerData[];
    enemies: Record<string, Enemy>;
}

interface GTFOLimbData
{
    name: string;

    breaker?: string;
    breakerGear?: string;

    gears: Record<string, GTFOGearData>;
}

interface GTFOEnemyData
{
    instanceID: string;
    type: string;
    alive: boolean;
    
    health: number;
    healthMax: number;

    timestamp?: number;
    killer?: string;
    killerGear?: string;
    mineInstance?: string;

    limbData: Record<string, GTFOLimbData>;
}

interface GTFOGearData
{
    playerID: string;
    name: string;
    archytype: string;
    damage: number;
    enemies: Set<string>;
}

interface GTFOPlayerData
{
    playerID: string;
    name: string;
    isBot: boolean;
    
    gears: Record<string, GTFOGearData>;
}

interface GTFOReport
{
    spec: GTFOSpec;
    allPlayers: Map<string, GTFOPlayerData>;
    players: Map<string, GTFOPlayerData>;
    enemies: Map<string, GTFOEnemyData>;

    getLoadout(id: string): GTFOLoadout;
    getPlayerGear(id: string, gear: string): GTFOGearData;
    getPlayerGearKills(id: string, gear: string): Record<string, number>;
}
interface GTFOReportConstructor
{
    new(type: string, jsonObj: JSONReport): GTFOReport;
    prototype: GTFOReport;
}

interface GTFOGear
{
    type: "main" | "secondary" | "tool" | "melee",
    publicName: string,
    archytypeName: string
}

interface GTFOLoadout
{
    main?: GTFOGear;
    secondary?: GTFOGear;
    tool?: GTFOGear;
    melee?: GTFOGear;
}

let GTFOReport: GTFOReportConstructor = function(this: GTFOReport, type: string, json: JSONReport)
{
    if (type != "HOST") throw new Error("Report type not recognised.");

    this.spec = GTFO_R7_R4;

    this.allPlayers = new Map();
    for (let player of json.players)
    {
        let p: GTFOPlayerData = {
            name: player.name,
            playerID: player.playerID,
            isBot: player.isBot,
            gears: {}
        };
        for (let gear in player.gears)
        {
            let data = player.gears[gear];
            p.gears[gear] = {
                playerID: p.playerID,
                name: gear,
                archytype: RHU.exists(this.spec.gear[gear]) ? this.spec.gear[gear].archytypeName : "",
                damage: data.damage,
                enemies: new Set()
            }
        }
        this.allPlayers.set(player.playerID, p);
    }

    this.players = new Map();
    for (let player of json.active)
    {
        this.players.set(player.playerID, this.allPlayers.get(player.playerID)!);
    }

    this.enemies = new Map();
    for (let id in json.enemies)
    {
        let data = json.enemies[id];
        let enemy: GTFOEnemyData = {
            instanceID: id,
            type: data.type,

            alive: data.alive,
            health: data.health,
            healthMax: data.healthMax,

            timestamp: data.timestamp,
            killer: data.killer,
            killerGear: data.killerGear,
            mineInstance: data.mineInstance,
            
            limbData: {}
        };
        if (RHU.exists(enemy.killer) && RHU.exists(enemy.killerGear))
        {
            let G = this.getPlayerGear(enemy.killer, enemy.killerGear);
            G.enemies.add(id);
        }
        for (let l in data.limbData)
        {
            let L = data.limbData[l];
            let limb: GTFOLimbData = {
                name: l,

                breaker: L.breaker,
                breakerGear: L.breakerGear,

                gears: {}
            }
            for (let p in L.gears)
            {
                for (let g in L.gears[p].gear)
                {
                    let damage = L.gears[p].gear[g];
                    let G = this.getPlayerGear(p, g);
                    G.enemies.add(id);
                    limb.gears[g] = {
                        playerID: p,
                        name: g,
                        archytype: RHU.exists(this.spec.gear[g]) ? this.spec.gear[g].archytypeName : "",
                        damage: damage,
                        enemies: G.enemies
                    }
                }
            }
            enemy.limbData[l] = limb;
        }
        this.enemies.set(id, enemy);
    }

    console.log(this);
} as Function as GTFOReportConstructor;
GTFOReport.prototype.getLoadout = function(id: string): GTFOLoadout
{
    if (!this.allPlayers.has(id)) throw new Error(`Player of id, ${id}, does not exist in report.`);
    let player = this.allPlayers.get(id)!;
    let loadout: GTFOLoadout = {};
    for (let g in player.gears)
    {
        if (g in this.spec.gear)
        {
            let gear = this.spec.gear[g];
            switch(gear.type)
            {
            case "main":
                loadout.main = gear;
                break;
            case "secondary":
                loadout.secondary = gear;
                break;
            case "melee":
                loadout.melee = gear;
                break;
            case "tool":
                loadout.tool = gear;
                break;
            }
        }
        else console.warn(`Unknown gear: ${g}, possibly modded content. Use a different GTFOSpec.`)
    }
    return loadout;
};
GTFOReport.prototype.getPlayerGear = function(id: string, gear: string): GTFOGearData
{
    let player = this.allPlayers.get(id);
    if (RHU.exists(player))
    {
        if (gear in player.gears) return player.gears[gear];
    }
    throw new Error(`Player or Gear, ${id} ${gear}, doesn't exist.`);
};
GTFOReport.prototype.getPlayerGearKills = function(id: string, gear: string): Record<string, number>
{
    let kills: Record<string, number> = {};
    let player = this.allPlayers.get(id);
    if (RHU.exists(player))
    {
        if (gear in player.gears) 
        {
            let data = player.gears[gear];
            for (let e of data.enemies.values())
            {
                let enemy = this.enemies.get(e);
                if (RHU.exists(enemy))
                {
                    if (!enemy.alive && enemy.killer === id && enemy.killerGear === gear)
                    {
                        if (enemy.type in kills) kills[enemy.type] += 1;
                        else kills[enemy.type] = 1;
                    }
                }
                else throw new Error("Enemy ID did not exist.");
            }
            return kills;
        }
    }
    throw new Error(`Player or Gear, ${id} ${gear}, doesn't exist.`);
}


interface GTFOSpec
{
    gear: Record<string, GTFOGear>
}

let GTFO_R7_R4: GTFOSpec = {
    gear: {
        "Shelling S49": {
            type: "main",
            publicName: "Shelling S49",
            archytypeName: "Pistol"
        },
        "Bataldo 3RB": {
            type: "main",
            publicName: "Bataldo 3RB",
            archytypeName: "HEL Revolver"
        },
        "Raptus Treffen 2": {
            type: "main",
            publicName: "Raptus Treffen 2",
            archytypeName: "Machine Pistol"
        },
        "Raptus Steigro": {
            type: "main",
            publicName: "Raptus Steigro",
            archytypeName: "HEL Autopistol"
        },
        "Accrat Golok DA": {
            type: "main",
            publicName: "Accrat Golok DA",
            archytypeName: "Bullpup Rifle"
        },
        "Van Auken LTC5": {
            type: "main",
            publicName: "Van Auken LTC5",
            archytypeName: "SMG"
        },
        "Accrat STB": {
            type: "main",
            publicName: "Accrat STB",
            archytypeName: "PDW"
        },
        "Van Auken CAB F4": {
            type: "main",
            publicName: "Van Auken CAB F4",
            archytypeName: "Carbine"
        },
        "TR22 Hanaway": {
            type: "main",
            publicName: "TR22 Hanaway",
            archytypeName: "DMR"
        },
        "Malatack LX": {
            type: "main",
            publicName: "Malatack LX",
            archytypeName: "Assault Rifle"
        },
        "Malatack CH 4": {
            type: "main",
            publicName: "Malatack CH 4",
            archytypeName: "Burst Rifle"
        },
        "Drekker Pres MOD 556": {
            type: "main",
            publicName: "Drekker Pres MOD 556",
            archytypeName: "Rifle"
        },
        "Bataldo J 300": {
            type: "main",
            publicName: "Bataldo J 300",
            archytypeName: "HEL Shotgun"
        },
        "Malatack HXC": {
            type: "secondary",
            publicName: "Malatack HXC",
            archytypeName: "Heavy Assault Rifle"
        },
        "Buckland s870": {
            type: "secondary",
            publicName: "Buckland s870",
            archytypeName: "Shotgun"
        },
        "Buckland AF6": {
            type: "secondary",
            publicName: "Buckland AF6",
            archytypeName: "Combat Shotgun"
        },
        "Buckland XDIST2": {
            type: "secondary",
            publicName: "Buckland XDIST2",
            archytypeName: "Choke Mod Shotgun"
        },
        "Mastaba R66": {
            type: "secondary",
            publicName: "Mastaba R66",
            archytypeName: "Revolver"
        },
        "Techman Arbalist V": {
            type: "secondary",
            publicName: "Techman Arbalist V",
            archytypeName: "Machine Gun"
        },
        "Techman Veruta XII": {
            type: "secondary",
            publicName: "Techman Veruta XII",
            archytypeName: "Machine Gun"
        },
        "Techman Klust 6": {
            type: "secondary",
            publicName: "Techman Klust 6",
            archytypeName: "Burst Cannon"
        },
        "Omneco EXP1": {
            type: "secondary",
            publicName: "Omneco EXP1",
            archytypeName: "HEL Gun"
        },
        "Shelling Arid 5": {
            type: "secondary",
            publicName: "Shelling Arid 5",
            archytypeName: "High Caliber Pistol"
        },
        "Drekker Del P1": {
            type: "secondary",
            publicName: "Drekker Del P1",
            archytypeName: "Precision Rifle"
        },
        "Köning PR 11": {
            type: "secondary",
            publicName: "Köning PR 11",
            archytypeName: "Sniper"
        },
        "Omneco LRG": {
            type: "secondary",
            publicName: "Omneco LRG",
            archytypeName: "HEL Rifle"
        },
        "Santonian HDH": {
            type: "melee",
            publicName: "Santonian HDH",
            archytypeName: "Sledgehammer"
        },
        "Mastaba Fixed Blade": {
            type: "melee",
            publicName: "Mastaba Fixed Blade",
            archytypeName: "Knife"
        },
        "Kovac Peacekeeper": {
            type: "melee",
            publicName: "Kovac Peacekeeper",
            archytypeName: "Bat"
        },
        "MACO Drillhead": {
            type: "melee",
            publicName: "MACO Drillhead",
            archytypeName: "Spear"
        },
        "Mechatronic SGB3": {
            type: "tool",
            publicName: "Mechatronic SGB3",
            archytypeName: "Burst Sentry"
        },
        "Mechatronic B5 LFR": {
            type: "tool",
            publicName: "Mechatronic B5 LFR",
            archytypeName: "Shotgun Sentry"
        },
        "AutoTek 51 RSG": {
            type: "tool",
            publicName: "AutoTek 51 RSG",
            archytypeName: "Sniper Sentry"
        },
        "Rad Labs Meduza": {
            type: "tool",
            publicName: "Rad Labs Meduza",
            archytypeName: "Auto Sentry"
        },
        "D-Tek Optron IV": {
            type: "tool",
            publicName: "D-Tek Optron IV",
            archytypeName: "Bio Tracker"
        },
        "Stalwart G2": {
            type: "tool",
            publicName: "Stalwart G2",
            archytypeName: "C-Foam Launcher"
        },
        "Krieger O4": {
            type: "tool",
            publicName: "Krieger O4",
            archytypeName: "Mine Deployer"
        }
    }
};