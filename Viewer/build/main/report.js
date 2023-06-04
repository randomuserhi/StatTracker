let GTFOReport = function (type, json) {
    if (type != "HOST")
        throw new Error("Report type not recognised.");
    this.spec = GTFO_R7_R4;
    this.allPlayers = new Map();
    for (let player of json.players) {
        let p = {
            name: player.name,
            playerID: player.playerID,
            isBot: player.isBot,
            healthMax: player.healthMax,
            dodges: player.dodges,
            gears: {}
        };
        for (let gear in player.gears) {
            let data = player.gears[gear];
            p.gears[gear] = {
                playerID: p.playerID,
                name: gear,
                archytype: RHU.exists(this.spec.gear[gear]) ? this.spec.gear[gear].archytypeName : "",
                damage: data.damage,
                enemies: new Set()
            };
        }
        this.allPlayers.set(player.playerID, p);
    }
    this.players = new Map();
    for (let player of json.active) {
        this.players.set(player.playerID, this.allPlayers.get(player.playerID));
    }
    this.enemies = new Map();
    for (let id in json.enemies) {
        let data = json.enemies[id];
        if (!(data.type in this.spec.enemies)) {
            console.warn(`Unrecognized enemy type: ${data.type}`);
            continue;
        }
        let type = this.spec.enemies[data.type].type;
        let enemy = {
            instanceID: id,
            type: type,
            alive: data.alive,
            health: data.health,
            healthMax: data.healthMax,
            timestamp: data.timestamp,
            killer: data.killer,
            killerGear: data.killerGear,
            mineInstance: data.mineInstance,
            limbData: {}
        };
        if (RHU.exists(enemy.killer) && RHU.exists(enemy.killerGear)) {
            let G = this.getPlayerGear(enemy.killer, enemy.killerGear);
            G.enemies.add(id);
        }
        for (let l in data.limbData) {
            let L = data.limbData[l];
            let limb = {
                name: l,
                breaker: L.breaker,
                breakerGear: L.breakerGear,
                gears: {}
            };
            for (let p in L.gears) {
                for (let g in L.gears[p].gear) {
                    let damage = L.gears[p].gear[g];
                    let G = this.getPlayerGear(p, g);
                    G.enemies.add(id);
                    limb.gears[g] = {
                        playerID: p,
                        name: g,
                        archytype: RHU.exists(this.spec.gear[g]) ? this.spec.gear[g].archytypeName : "",
                        damage: damage,
                        enemies: G.enemies
                    };
                }
            }
            enemy.limbData[l] = limb;
        }
        this.enemies.set(id, enemy);
    }
    console.log(this);
};
GTFOReport.prototype.getLoadout = function (id) {
    if (!this.allPlayers.has(id))
        throw new Error(`Player of id, ${id}, does not exist in report.`);
    let player = this.allPlayers.get(id);
    let loadout = {};
    for (let g in player.gears) {
        if (g in this.spec.gear) {
            let gear = this.spec.gear[g];
            switch (gear.type) {
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
        else
            console.warn(`Unknown gear: ${g}, possibly modded content. Use a different GTFOSpec.`);
    }
    return loadout;
};
GTFOReport.prototype.getPlayerGear = function (id, gear) {
    let player = this.allPlayers.get(id);
    if (RHU.exists(player)) {
        if (gear in player.gears)
            return player.gears[gear];
    }
    throw new Error(`Player or Gear, ${id} ${gear}, doesn't exist.`);
};
GTFOReport.prototype.getPlayerGearKills = function (id, gear) {
    let kills = {};
    let player = this.allPlayers.get(id);
    if (RHU.exists(player)) {
        if (gear in player.gears) {
            let data = player.gears[gear];
            for (let e of data.enemies.values()) {
                let enemy = this.enemies.get(e);
                if (RHU.exists(enemy)) {
                    if (!enemy.alive && enemy.killer === id && enemy.killerGear === gear) {
                        if (enemy.type in kills)
                            kills[enemy.type] += 1;
                        else
                            kills[enemy.type] = 1;
                    }
                }
                else
                    throw new Error("Enemy ID did not exist.");
            }
            return kills;
        }
    }
    throw new Error(`Player or Gear, ${id} ${gear}, doesn't exist.`);
};
let GTFO_Shooter = {
    type: "Shooter",
    dodgeValue: 1.25
};
let GTFO_BigShooter = {
    type: "Big Shooter",
    dodgeValue: 1.5
};
let GTFO_Hybrid = {
    type: "Hybrid",
    dodgeValue: 1
};
let GTFO_Striker = {
    type: "Striker",
    dodgeValue: 3
};
let GTFO_BigStriker = {
    type: "Big Striker",
    dodgeValue: 6
};
let GTFO_Charger = {
    type: "Charger",
    dodgeValue: 4.5
};
let GTFO_BigCharger = {
    type: "Big Charger",
    dodgeValue: 6
};
let GTFO_Scout = {
    type: "Scout",
    dodgeValue: 1
};
let GTFO_ChargerScout = {
    type: "Charger Scout",
    dodgeValue: 0
};
let GTFO_R7_R4 = {
    enemies: {
        "Shooter": GTFO_Shooter,
        "Big Shooter": GTFO_BigShooter,
        "Hybrid": GTFO_Hybrid,
        "Striker": GTFO_Striker,
        "Big Striker": GTFO_BigStriker,
        "Charger": GTFO_Charger,
        "Big Charger": GTFO_BigCharger,
        "Scout": GTFO_Scout,
        "Charger Scout": GTFO_ChargerScout,
        "Shooter_Wave": GTFO_Shooter,
        "Shooter_Hibernate": GTFO_Shooter,
        "Shooter_Big_Wave": GTFO_BigShooter,
        "Shooter_Big_RapidFire": GTFO_Hybrid,
        "Striker_Wave": GTFO_Striker,
        "Striker_Hibernate": GTFO_Striker,
        "Striker_Big_Wave": GTFO_BigStriker,
        "Scout_Bullrush": GTFO_ChargerScout
    },
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
