declare namespace RHU { namespace Macro {
    interface TemplateMap
    {
        "enemyList": enemyList;
        "enemySummary": enemySummary;
        "limbSummary": limbSummary;
    }
}}

interface enemyList extends HTMLDivElement
{
    report?: GTFOReport;
    enemies: GTFOEnemyData[];
    collection: Map<string, Element>;

    list: HTMLDivElement;
    
    loaded: boolean;
    load(report: GTFOReport, filter?: (e: GTFOEnemyData) => boolean): void;
    goTo(name: string): void;
}
interface enemyListConstructor extends RHU.Macro.Constructor<enemyList>
{
    
}

interface enemySummary extends HTMLDivElement
{
    report?: GTFOReport;

    damage: HTMLSpanElement;
    table: HTMLDivElement;
    damageTable: HTMLTableElement;
    table2: HTMLDivElement;
    damagetakenTable: HTMLTableElement;
    limb: HTMLDivElement;
    limbTable: HTMLUListElement;

    toggle: HTMLButtonElement;

    load(enemy: GTFOEnemyData, report: GTFOReport): void;
}
interface enemySummaryConstructor extends RHU.Macro.Constructor<enemySummary>
{
    
}

interface limbSummary extends HTMLDivElement
{
    report?: GTFOReport;

    state: HTMLSpanElement;
    name: HTMLHeadingElement;
    damage: HTMLSpanElement;
    gear: HTMLImageElement;
    player: HTMLSpanElement;
    damageTable: HTMLTableElement;

    load(limb: GTFOLimbData, enemy: GTFOEnemyData, report: GTFOReport): void;
}
interface limbSummaryConstructor extends RHU.Macro.Constructor<limbSummary>
{
    
}

RHU.import(RHU.module({ trace: new Error(),
    name: "Enemy List", hard: ["RHU.Macro", "RHU.Rest"],
    callback: function()
    {
        let { RHU } = window.RHU.require(window, this);

        let GTFOIcons = new Map<string, HTMLImageElement>();
        if (true)
        {
            let img = new Image();
            img.src = "./icons/general/checkpoint.png";
            GTFOIcons.set("checkpoint", img)
        }

        let limbSummary = function(this: limbSummary)
        {

        } as Function as limbSummaryConstructor;
        limbSummary.prototype.load = function(limb: GTFOLimbData, enemy: GTFOEnemyData, report: GTFOReport)
        {
            this.name.innerHTML = limb.name;
            this.state.innerHTML = RHU.exists(limb.breaker) ? "Broken" : "Intact";
            this.gear.src = RHU.exists(limb.breakerGear) ? `./icons/gear/${limb.breakerGear}.webp` : "";
            if (RHU.exists(limb.breaker))
            {
                let player = report.allPlayers.get(limb.breaker);
                this.player.innerHTML = RHU.exists(player) ? player.name : "";
            }

            let damage = 0;
            for (let g in limb.gears)
            {
                let gear = limb.gears[g];
                damage += gear.damage;
            }
            this.damage.innerHTML = `${damage.toFixed(2)}`;
            if (damage === 0)
            {
                this.style.display = "none";
            }

            let fragment = new DocumentFragment();
            if (true)
            {
                let item = document.createElement("tr");
                let col0 = document.createElement("td");
                col0.style.paddingBottom = "0.5rem";
                let col1 = document.createElement("td");
                col1.style.paddingLeft = "2rem";
                col1.style.paddingBottom = "0.5rem";
                let col2 = document.createElement("td");
                col2.style.paddingLeft = "2rem";
                col2.style.paddingBottom = "0.5rem";
                col0.innerHTML = `<u>Player</u>`;
                col1.innerHTML = `<u>Gear</u>`;
                col2.innerHTML = `<u>Damage</u>`;
                item.append(col0, col1, col2);
                fragment.append(item);
            }
            for (let g in limb.gears)
            {
                let gear = limb.gears[g];
                let player = report.allPlayers.get(gear.playerID);
                if (RHU.exists(gear) && RHU.exists(player) && gear.damage > 0)
                {
                    let item = document.createElement("tr");
                    let col0 = document.createElement("td");
                    col0.style.paddingBottom = "0.5rem";
                    let col1 = document.createElement("td");
                    col1.style.paddingLeft = "2rem";
                    col1.style.paddingBottom = "0.5rem";
                    let col2 = document.createElement("td");
                    col2.style.paddingLeft = "2rem";
                    col2.style.paddingBottom = "0.5rem";
                    col0.innerHTML = `<span>${player.name}</span>`;
                    col1.innerHTML = `<img style="width: 4rem;" src="./icons/gear/${gear.name}.webp"></img>`;
                    col2.innerHTML = `${gear.damage.toFixed(2)}`;
                    item.append(col0, col1, col2);
                    fragment.append(item);
                }
            }
            this.damageTable.replaceChildren(fragment);
        }
        RHU.Macro(limbSummary, "limbSummary", //html
            `
            <h2 rhu-id="name" style="padding-top: 2rem; padding-bottom: 1rem;">Unknown</h2>
            <ul style="display: flex; gap: 2.5rem; align-items: center;">
                <li style="display: flex; gap: 1rem;">
                    Damage <span rhu-id="damage" style="color: #e9bc29;">0</span>
                </li>
                <li style="display: flex; gap: 1rem;">
                    <span rhu-id="state" style="">0</span>
                </li>
                <li style="display: flex; gap: 1rem;">
                    <img rhu-id="gear" style="width: 4rem;"/>
                </li>
                <li style="display: flex; gap: 1rem;">
                    <span rhu-id="player" style="color: #e9bc29;"></span>
                </li>
            </ul>
            <table rhu-id="damageTable" style="margin-top: 1rem;"> <!-- damage, gear, player -->
            </table>
            `, {
                element: //html
                `<li></li>`
            });

        let enemySummary = function(this: enemySummary)
        {
            this.toggle.addEventListener("click", () => {
                if (this.limb.style.display === "none")
                {
                    this.limb.style.display = "block";
                }
                else
                {
                    this.limb.style.display = "none";
                }
            });
        } as Function as enemySummaryConstructor;
        enemySummary.prototype.load = function(enemy: GTFOEnemyData, report: GTFOReport)
        {
            let totalDamage = 0;
            let damages: Record<string, number> = {};
            for (let player of report.allPlayers.values())
            {
                if (!(player.playerID in damages))
                    damages[player.playerID] = 0;
                
                for (let e of player.damageTimeline.filter((e) => {
                    return RHU.exists(e.enemyInstanceID) && e.enemyInstanceID === enemy.instanceID; 
                }))
                {
                    damages[player.playerID] += e.damage;
                    totalDamage += e.damage;
                }
            }

            this.damage.innerHTML = `${Math.round(totalDamage / 25 * 100)}`;
            let fragment = new DocumentFragment();
            if (true)
            {
                let item = document.createElement("tr");
                let col0 = document.createElement("td");
                col0.style.paddingBottom = "0.5rem";
                let col1 = document.createElement("td");
                col1.style.paddingLeft = "2rem";
                col1.style.paddingBottom = "0.5rem";
                col0.innerHTML = `<u>Player</u>`;
                col1.innerHTML = `<u>Damage</u>`;
                item.append(col0, col1);
                fragment.append(item);
            }
            for (let p in damages)
            {
                let player = report.allPlayers.get(p);
                if (RHU.exists(player) && damages[p] > 0)
                {
                    let item = document.createElement("tr");
                    let col0 = document.createElement("td");
                    col0.style.paddingBottom = "0.5rem";
                    let col1 = document.createElement("td");
                    col1.style.paddingLeft = "2rem";
                    col1.style.paddingBottom = "0.5rem";
                    col0.innerHTML = `${player.name}`;
                    col1.innerHTML = `<span style="color: #e9bc29;">${Math.round(damages[p] / 25 * 100)}</span>`;
                    item.append(col0, col1);
                    fragment.append(item);

                    this.table.style.display = "block";
                }
            }
            this.damageTable.replaceChildren(fragment);

            fragment = new DocumentFragment();
            if (true)
            {
                let item = document.createElement("tr");
                let col0 = document.createElement("td");
                col0.style.paddingBottom = "0.5rem";
                let col1 = document.createElement("td");
                col1.style.paddingLeft = "2rem";
                col1.style.paddingBottom = "0.5rem";
                col0.innerHTML = `<u>Player</u>`;
                col1.innerHTML = `<u>Damage</u>`;
                item.append(col0, col1);
                fragment.append(item);
            }
            let playerDamage: Record<string, number> = {};
            for (let l in enemy.limbData)
            {
                let limb = enemy.limbData[l];
                for (let g in limb.gears)
                {
                    let gear = limb.gears[g];
                    if (!(gear.playerID in playerDamage))
                        playerDamage[gear.playerID] = 0;
                    playerDamage[gear.playerID] += gear.damage;
                }
            }
            for (let p in playerDamage)
            {
                let player = report.allPlayers.get(p);
                if (RHU.exists(player) && playerDamage[p] > 0)
                {
                    let item = document.createElement("tr");
                    let col0 = document.createElement("td");
                    col0.style.paddingBottom = "0.5rem";
                    let col1 = document.createElement("td");
                    col1.style.paddingLeft = "2rem";
                    col1.style.paddingBottom = "0.5rem";
                    col0.innerHTML = `${player.name}`;
                    col1.innerHTML = `<span style="color: #e9bc29;">${playerDamage[p].toFixed(2)}</span>`;
                    item.append(col0, col1);
                    fragment.append(item);

                    this.table2.style.display = "block";
                }
            }
            this.damagetakenTable.replaceChildren(fragment);

            fragment = new DocumentFragment();
            for (let l in enemy.limbData)
            {
                let limb = enemy.limbData[l];
                let summary = document.createMacro("limbSummary");
                summary.load(limb, enemy, report);
                fragment.append(summary);
            }
            this.limbTable.replaceChildren(fragment);
        }
        RHU.Macro(enemySummary, "enemySummary", //html
            `
            <div rhu-id="table" style="display: none;">
                <div style="margin-bottom: 1rem">
                    <ul style="display: flex; gap: 2.5rem;">
                        <li style="display: flex; gap: 1rem;">
                            Damage Dealt <span rhu-id="damage" style="color: #e9bc29;">67.95</span>
                        </li>
                        <li style="display: flex; gap: 1rem;">
                        </li>
                        <li style="display: flex; gap: 1rem;">
                        </li>
                    </ul>
                </div>

                <table rhu-id="damageTable">
                </table>
            </div>
            <div rhu-id="table2" style="display: none; margin-top: 2rem;">
                <h3>Damage taken:</h3>
                <table rhu-id="damagetakenTable" style="margin-top: 0.5rem;">
                </table>
            </div>
            <button rhu-id="toggle" style="margin-top: 0.5rem; padding-top: 0.6rem; padding-bottom: 0.6rem; font-size: 17px;">LIMBS</button>
            <div rhu-id="limb" style="display: none;">
                <ul rhu-id="limbTable">
                </ul>
            </div>
            `, {
                element: //html
                `<div style="
                    border-top-style: solid;
                    border-top-width: 1px;
                    border-color: #3b3b3b;
                    grid-column: 1 / 8;
                    margin-top: 1rem;
                    padding-top: 1rem;
                    margin-bottom: 2rem;"></div>`
            });

        let enemyList = function(this: enemyList)
        {
            this.loaded = false;
            this.collection = new Map();
        } as Function as enemyListConstructor;
        enemyList.prototype.load = function(report: GTFOReport, filter?: (e: GTFOEnemyData) => boolean)
        {
            if (this.loaded) return;
            this.loaded = true;

            this.report = report;

            // Generate List
            this.report = report;
            this.enemies = [...report.enemies.values()];
            if (RHU.exists(filter))
                this.enemies = this.enemies.filter(filter);

            if (this.enemies.length > 0)
            {
                let fragment = new DocumentFragment();

                for (let enemy of this.enemies)
                {
                    let gear = "";
                    if (!enemy.alive && RHU.exists(enemy.killerGear))
                    {
                        gear = //html
                        `
                            <img style="width: 4rem;" src="./icons/gear/${enemy.killerGear}.webp"/>
                        `
                    }

                    let f = RHU.Macro.parseDomString(
                        /*html*/`
                            <div>
                                <img style="width: 4rem;" src="./icons/enemies/${enemy.type}.png"/>
                            </div>
                            <div style="">
                                ${enemy.name}
                            </div>
                            <div style="">
                                ${enemy.type}
                            </div>
                            <div style="">
                                ${enemy.alive ? "Alive" : "Dead"}
                            </div>
                            <div style="color: rgb(200, 173, 98);">
                                ${enemy.alive ? "" : timeToString(enemy.timestamp!)}
                            </div>
                            <div>
                                ${gear}
                            </div>
                            <div style="">
                                ${(!enemy.alive && RHU.exists(enemy.killer)) ? ("<span style='color: #e9bc29;'>" + report.allPlayers.get(enemy.killer)!.name + "</span>") : ""}
                            </div>
                        `);
                    let el = f.children[0];
                    this.collection.set(enemy.name, el);
                    fragment.append(f);

                    let summary = document.createMacro("enemySummary");
                    summary.load(enemy, report);
                    fragment.append(summary);
                }

                this.list.replaceChildren(fragment);
                this.style.display = "block";
            }
        }
        enemyList.prototype.goTo = function(name: string)
        {
            if (this.collection.has(name))
            {
                let e = this.collection.get(name)!;
                e.scrollIntoView({behavior: "smooth"});
            }
        }
        RHU.Macro(enemyList, "enemyList", //html
            `
            <div style="
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
                align-items: center;
            " rhu-id="list"></div>
            `, {
                element: //html
                `<div style="display: none"></div>`
            });
    }
}));