interface reportmount extends HTMLDivElement
{
    open(report: GTFOReport): void;

    navbar: {btn: HTMLElement, panel: Panel}[];
    report: GTFOReport | null;
    view: "players" | "enemies";
    playersBtn: HTMLLIElement;
    enemiesBtn: HTMLLIElement;
    body: HTMLDivElement;
}
interface reportmountConstructor extends RHU.Macro.Constructor<reportmount>
{
    
}

interface Panel extends HTMLElement
{
    reset(): void;
}

interface enemyPanel extends Panel
{
    list: enemyList;
}
interface enemyPanelConstructor extends RHU.Macro.Constructor<enemyPanel>
{
    
}

interface playerPanel extends Panel
{
    vid: HTMLVideoElement;
    slots: playerInfo[];
    slot0: playerInfo;
    slot1: playerInfo;
    slot2: playerInfo;
    slot3: playerInfo;
    footer: playerPanelFooter;

    resize(): void;
}
interface playerPanelConstructor extends RHU.Macro.Constructor<playerPanel>
{
    
}

interface playerInfo extends HTMLDivElement
{
    loaded: boolean;

    body: HTMLDivElement;
    disconnected: HTMLDivElement;

    name: HTMLButtonElement;

    slotList: HTMLUListElement;

    achievements: HTMLUListElement;
    achievementName: HTMLHeadElement;
    achievementAlt: HTMLSpanElement;
    main: HTMLDivElement;
    mainImg: HTMLImageElement;
    secondary: HTMLDivElement;
    secondaryImg: HTMLImageElement;
    tool: HTMLDivElement;
    toolImg: HTMLImageElement;
    melee: HTMLDivElement;
    meleeImg: HTMLImageElement;

    full: playerInfoFull;

    load(player: GTFOPlayerData): void;
    panel: playerPanel;
}
interface playerInfoConstructor extends RHU.Macro.Constructor<playerInfo>
{
    
}

interface playerPanelFooter extends HTMLDivElement
{
    panel: playerPanel;
}
interface playerPanelFooterConstructor extends RHU.Macro.Constructor<playerPanelFooter>
{
    
}

declare namespace RHU { namespace Macro {
    interface TemplateMap
    {
        "report": reportmount;
        "enemyPanel": enemyPanel;
        "playerPanel": playerPanel;
        "playerInfo": playerInfo;
        "playerInfoFull": playerInfoFull;
        "playerPanelFooter": playerPanelFooter;
        "gearRecap": gearRecap;
        "playerSummary": playerSummary;
    }
}}

interface playerInfoFull extends HTMLDivElement
{
    body: HTMLDivElement;

    name: HTMLHeadingElement;
    summary: playerSummary;
    gears: HTMLUListElement;

    load(id: string): void;
    owner: playerInfo;
}
interface playerInfoFullConstructor extends RHU.Macro.Constructor<playerInfoFull>
{
    
}

interface gearRecap extends HTMLLIElement
{
    load(id: string, gear: string): void;

    body: HTMLDivElement;

    name: HTMLSpanElement;
    img: HTMLImageElement;

    damage: HTMLSpanElement;
    kills: HTMLSpanElement;
    assists: HTMLSpanElement;

    killtable: HTMLTableElement;
    instances: HTMLDivElement;
}
interface gearRecapConstructor extends RHU.Macro.Constructor<gearRecap>
{
    
}

interface playerSummary extends HTMLDivElement
{
    load(id: string): void;

    timeline: graph;

    med: HTMLSpanElement;
    ammo: HTMLSpanElement;
    tool: HTMLSpanElement;
    disinfect: HTMLSpanElement;

    damageAvoided: HTMLSpanElement;
    dodgetable: HTMLTableElement;
}
interface playerSummaryConstructor extends RHU.Macro.Constructor<playerSummary>
{

}

let mount: reportmount;

RHU.import(RHU.module({ trace: new Error(),
    name: "Report", hard: ["RHU.Macro", "RHU.Rest"],
    callback: function()
    {
        let { RHU } = window.RHU.require(window, this);

        let playerSummary = function(this: playerSummary)
        {
        } as Function as playerSummaryConstructor;
        playerSummary.prototype.load = function(id: string): void
        {
            let report = mount.report!;
            let spec = report.spec;
            let player = report.players.get(id)!;
            
            if (RHU.exists(player.packs["Health"])) this.med.innerHTML = `${player.packs["Health"].length}`;
            if (RHU.exists(player.packs["Ammo"])) this.ammo.innerHTML = `${player.packs["Ammo"].length}`;
            if (RHU.exists(player.packs["Tool"])) this.tool.innerHTML = `${player.packs["Tool"].length}`;
            if (RHU.exists(player.packs["Disinfect"])) this.disinfect.innerHTML = `${player.packs["Disinfect"].length}`;

            let damageAvoided = 0;
            let dodges: Record<string, number> = {};
            for (let event of player.dodges)
            {
                let enemy = report.enemies.get(event.enemyInstanceID);
                if (!RHU.exists(enemy))
                {
                    console.warn(`Enemy, ${event.enemyInstanceID}, does not exist.`);
                    continue;
                }
                if (enemy.type in dodges)
                    dodges[enemy.type] += 1;
                else
                    dodges[enemy.type] = 1;
                let dam = spec.enemies[enemy.type].dodgeValue / player.healthMax * 100;
                damageAvoided += dam;
            }
            this.damageAvoided.innerHTML = `${Math.round(damageAvoided)}`;
            let fragment = new DocumentFragment();
            if (true)
            {
                let row = document.createElement("tr");
                let col0 = document.createElement("td");
                col0.style.paddingBottom = "0.5rem";
                let col1 = document.createElement("td");
                col1.style.paddingBottom = "0.5rem";
                let col2 = document.createElement("td");
                col2.style.paddingBottom = "0.5rem";

                col0.innerHTML = `<u>Type</u>`;
                col1.style.paddingLeft = "2rem";
                col1.innerHTML = `<u>Occurence</u>`;
                col2.style.paddingLeft = "2rem";
                col2.innerHTML = `<u>Avoided</u>`;
                row.append(col0, col1, col2);
                fragment.append(row);
            }
            for (let type in dodges)
            {
                let row = document.createElement("tr");
                let col0 = document.createElement("td");
                let col1 = document.createElement("td");
                let col2 = document.createElement("td");
                col0.innerHTML = `${type}`;
                col1.style.paddingLeft = "2rem";
                col1.innerHTML = `${dodges[type]}`;
                col2.style.paddingLeft = "2rem";
                col2.style.color = "#e9bc29";
                col2.innerHTML = `${Math.round(dodges[type] * spec.enemies[type].dodgeValue / player.healthMax * 100)}`;
                row.append(col0, col1, col2);
                fragment.append(row);
            }
            this.dodgetable.replaceChildren(fragment);

            this.timeline.load(player, report);

            if (damageAvoided > 0)
                this.dodgetable.style.display = "block";
        }
        RHU.Macro(playerSummary, "playerSummary", //html
            `
            <div style="margin-bottom: 2rem;">
                <rhu-macro rhu-id="timeline" rhu-type="graph"></rhu-macro>
            </div>
            <div class="margins">
                <div class="margins-wrapper">
                    <h2 style="display: flex; gap: 3rem; align-items: center; margin-bottom: 1rem;">
                        <span>Resources</span>
                    </h2>
                    <div style="margin-bottom: 2rem;">
                        <ul style="display: flex; gap: 2.5rem;">
                            <li style="display: flex; gap: 1rem; align-items: center;">
                                <img style="width: 4rem;" src="./icons/packs/Health.webp"/>
                                <span rhu-id="med">0</span>
                            </li>
                            <li style="display: flex; gap: 1rem; align-items: center;">
                                <img style="width: 4rem;" src="./icons/packs/Ammo.webp"/>
                                <span rhu-id="ammo">0</span>
                            </li>
                            <li style="display: flex; gap: 1rem; align-items: center;">
                                <img style="width: 4rem;" src="./icons/packs/Tool.webp"/>
                                <span rhu-id="tool">0</span>
                            </li>
                            <li style="display: flex; gap: 1rem; align-items: center;">
                                <img style="width: 4rem;" src="./icons/packs/Disinfect.webp"/>
                                <span rhu-id="disinfect">0</span>
                            </li>
                        </ul>
                    </div>
                    <h2 style="display: flex; gap: 3rem; align-items: center; margin-bottom: 1rem;">
                        <span>Dodges</span>
                    </h2>
                    <div style="display: flex;">
                        <div style="flex: 0.7; padding-right: 1.5rem;">
                            <div style="margin-bottom: 1rem">
                                <ul style="display: flex; gap: 2.5rem;">
                                    <li style="flex: 1; display: flex; gap: 1rem;">
                                        Damage Avoided <span style="color: #e9bc29;" rhu-id="damageAvoided">0</span>
                                    </li>
                                </ul>
                            </div>
                            <table rhu-id="dodgetable" style="display: none;">
                            </table>
                        </div>
                        <div style="flex: 1; padding-left: 2rem;">
                            <!-- TODO -->
                        </div>
                    </div>
                </div>
            </div>
            `, {
                element: //html
                `<div></div>`
            });

        let gearRecap = function(this: gearRecap)
        {
        } as Function as gearRecapConstructor;
        gearRecap.prototype.load = function(id: string, gearID: string): void
        {
            let report = mount.report!;
            let player = report.players.get(id)!;
            let gear = player.gears[gearID];

            this.name.innerHTML = gearID;
            this.img.src = `./icons/gear/${gearID}.webp`;

            let kills = report.getPlayerGearKills(id, gearID);
            let total = 0;
            let fragment = new DocumentFragment();
            if (true)
            {
                let row = document.createElement("tr");
                let col0 = document.createElement("td");
                col0.style.paddingBottom = "0.5rem";
                let col1 = document.createElement("td");
                col1.style.paddingBottom = "0.5rem";
                col0.innerHTML = `<u>Type</u>`;
                col1.style.paddingLeft = "2rem";
                col1.innerHTML = `<u>Kills</u>`;
                row.append(col0, col1);
                fragment.append(row);
            }
            for (let type in kills)
            {
                total += kills[type];

                let row = document.createElement("tr");
                let col0 = document.createElement("td");
                let col1 = document.createElement("td");
                col0.innerHTML = type;
                col1.style.paddingLeft = "2rem";
                col1.innerHTML = kills[type].toString();
                row.append(col0, col1);
                fragment.append(row);
            }
            this.killtable.replaceChildren(fragment);

            if (RHU.exists(gear.mines))
            {
                let mineInstance = document.createElement("ul");

                let mines: GTFOMineInstance[] = [];
                for (let mine in gear.mines)
                    mines.push(gear.mines[mine]);
                mines.sort((a, b) => b.timestamp - a.timestamp);
                for (let mine of mines)
                {
                    let item = document.createElement("li");
                    item.style.marginTop = "1rem";
                    item.style.display = "flex";
                    item.style.gap = "2rem";
                    
                    let wrapper = document.createElement("div");
                    let icon = document.createElement("img");
                    icon.style.width = "2rem";
                    if (gear.name !== "Krieger O4")
                        icon.src = "./icons/consumables/mine.webp";
                    else
                    icon.src = "./icons/consumables/mine.png";
                    wrapper.append(icon);
                    item.append(wrapper);

                    let table = document.createElement("table");
                    let kills: Record<string, number> = {};
                    for (let id of mine.enemies.values())
                    {
                        let enemy = report.enemies.get(id)!;
                        if (enemy.type in kills)
                            kills[enemy.type] += 1;
                        else
                            kills[enemy.type] = 1;
                    }
                    let fragment = new DocumentFragment();
                    if (true)
                    {
                        let row = document.createElement("tr");
                        let col0 = document.createElement("td");
                        col0.style.paddingBottom = "0.5rem";
                        let col1 = document.createElement("td");
                        col1.style.paddingBottom = "0.5rem";
                        col0.innerHTML = `<u>Type</u>`;
                        col1.style.paddingLeft = "2rem";
                        col1.innerHTML = `<u>Kills</u>`;
                        row.append(col0, col1);
                        fragment.append(row);
                    }
                    for (let type in kills)
                    {
                        let row = document.createElement("tr");
                        let col0 = document.createElement("td");
                        let col1 = document.createElement("td");
                        col0.innerHTML = type;
                        col1.style.paddingLeft = "2rem";
                        col1.innerHTML = kills[type].toString();
                        row.append(col0, col1);
                        fragment.append(row);
                    }
                    table.replaceChildren(fragment);

                    item.append(table);

                    mineInstance.append(item);
                }

                this.instances.replaceChildren();
                this.instances.append(mineInstance);

                if (mines.length > 0)
                    this.instances.style.display = "block";
            }
            
            this.damage.innerHTML = `${gear.damage.toFixed(2)}`;
            this.kills.innerHTML = `${total}`;
            this.assists.innerHTML = `${[...gear.enemies.values()].filter((i) => {
                let e = report.enemies.get(i);
                return RHU.exists(e) && !e.alive && RHU.exists(e.killer) && e.killer !== player.playerID;
            }).length}`;

            if (total > 0)
                this.body.style.display = "block";
        }
        RHU.Macro(gearRecap, "gearRecap", //html
            `
            <div class="margins">
                <div class="margins-wrapper">
                    <h2 style="display: flex; gap: 3rem; align-items: center; margin-bottom: 1rem;">
                        <img rhu-id="img" style="height: 4rem;" src=""/>
                        <span rhu-id="name">UNKNOWN</span>
                    </h2>
                    <div style="display: flex;">
                        <div style="padding-right: 1.5rem;">
                            <div style="margin-bottom: 1rem">
                                <ul style="display: flex; gap: 2.5rem;">
                                    <li style="display: flex; gap: 1rem;">
                                        Damage <span style="color: #e9bc29;" rhu-id="damage">0</span>
                                    </li>
                                    <li style="display: flex; gap: 1rem;">
                                        Kills <span rhu-id="kills">0</span>
                                    </li>
                                    <li style="display: flex; gap: 1rem;">
                                        Assists <span rhu-id="assists">0</span>
                                    </li>
                                </ul>
                            </div>
                            <div rhu-id="body" style="display: none;">
                                <table rhu-id="killtable">
                                </table>
                                <div rhu-id="instances">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `, {
                element: //html
                `<li></li>`
            });

        let playerInfoFull = function(this: playerInfoFull)
        {
        } as Function as playerInfoFullConstructor;
        playerInfoFull.prototype.load = function(id: string): void
        {
            let report = mount.report!;
            let player = report.allPlayers.get(id);
            if (!RHU.exists(player)) return;

            this.name.innerHTML = player.name;

            this.body.style.display = "block";

            this.summary.load(player.playerID);

            let loadout = report.getLoadout(player.playerID);
            if (RHU.exists(loadout.main))
            {
                let recap = document.createMacro("gearRecap");
                this.gears.append(recap);
                recap.load(player.playerID, loadout.main.publicName);
            }
            if (RHU.exists(loadout.secondary))
            {
                let recap = document.createMacro("gearRecap");
                this.gears.append(recap);
                recap.load(player.playerID, loadout.secondary.publicName);
            }
            if (RHU.exists(loadout.tool))
            {
                let recap = document.createMacro("gearRecap");
                this.gears.append(recap);
                recap.load(player.playerID, loadout.tool.publicName);
            }
            if (RHU.exists(loadout.melee))
            {
                let recap = document.createMacro("gearRecap");
                this.gears.append(recap);
                recap.load(player.playerID, loadout.melee.publicName);
            }
        }
        RHU.Macro(playerInfoFull, "playerInfoFull", //html
            `
            <div class="margins">
                <div class="margins-wrapper">
                    <h1 rhu-id="name" style="padding-top: 2rem; font-family: Share Tech Mono; font-weight: 800;">DISCONNECTED</h1>
                </div>
            </div>
            <div rhu-id="body" style="display: none;">
                <rhu-macro rhu-id="summary" rhu-type="playerSummary">
                    <!-- player summary -->
                    <!-- key achievements -->
                </rhu-macro>
                <ul rhu-id="gears" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 2rem;">
                    <!-- gear recap -->
                </ul>
                <div style="margin-top: 2rem;">
                    <!-- TODO(randomuserhi) -->
                    <!-- damage taken timeline -->
                    <!-- health timeline -->
                    <!-- packs timeline -->
                </div>
                <div style="margin-top: 2rem;">
                    <!-- TODO(randomuserhi) -->
                    <!-- all achievements -->
                </div>
            </div>
            `, {
                element: //html
                `<div></div>`
            });

        // TODO(randomuser): When panel gets too small, convert into button that takes up entire slot on video
        let playerInfo = function(this: playerInfo)
        {
            this.loaded = false;
            const self = this;
            this.full = document.createMacro("playerInfoFull");
            this.addEventListener("click", function() {
                self.panel.footer.replaceChildren(self.full);
                self.panel.resize();
                self.full.scrollIntoView({behavior: "smooth"});
                requestAnimationFrame(() => { 
                    self.full.summary.timeline.render(); 
                });
            });
        } as Function as playerInfoConstructor;
        playerInfo.prototype.load = function(this: playerInfo, player: GTFOPlayerData): void
        {
            if (this.loaded) return;
            this.loaded = true;

            this.disconnected.style.display = "none";
            this.body.style.display = "block";

            this.name.innerHTML = player.name;
            
            let report = mount.report!;

            let loadout = report.getLoadout(player.playerID);
            if (RHU.exists(loadout.main))
            {
                this.main.innerHTML = loadout.main.publicName;
                this.mainImg.src = `./icons/gear/${loadout.main.publicName}.webp`;
            }
            if (RHU.exists(loadout.secondary))
            {
                this.secondary.innerHTML = loadout.secondary.publicName;
                this.secondaryImg.src = `./icons/gear/${loadout.secondary.publicName}.webp`;
            }
            if (RHU.exists(loadout.tool))
            {
                this.tool.innerHTML = loadout.tool.publicName;
                this.toolImg.src = `./icons/gear/${loadout.tool.publicName}.webp`;
            }
            if (RHU.exists(loadout.melee))
            {
                this.melee.innerHTML = loadout.melee.publicName;
                this.meleeImg.src = `./icons/gear/${loadout.melee.publicName}.webp`;
            }

            let list = report.getAchievements(player.playerID);
            for (let i = 0; i < list.length && i < 4; ++i)
            {
                let item = document.createElement("li");
                let icon = document.createElement("img");
                icon.src = `./icons/achievements/${list[i].type}.png`;
                icon.style.width = "5rem";
                icon.style.padding = "0.5rem";
                item.append(icon);
                item.addEventListener("mouseover", () => {
                    if (RHU.exists(achievements[list[i].type]))
                    {
                        this.achievementName.innerHTML = achievements[list[i].type].name;
                        this.achievementAlt.innerHTML = achievements[list[i].type].alt;
                        this.achievementAlt.append(RHU.Macro.parseDomString(`<div style="font-family: 'Share Tech Mono'; text-align: center;">${list[i].text}</div>`));
                    }
                    else
                    {
                        this.achievementName.innerHTML = "Unknown";
                        this.achievementAlt.innerHTML = "Unknown";
                    }
                });
                this.achievements.append(item);
            }

            this.full.load(player.playerID);
        };
        RHU.Macro(playerInfo, "playerInfo", //html
            `
            <div style="display: block; padding: 1rem; color: #e11900" rhu-id="disconnected">
                DISCONNECTED
            </div>
            <div style="display: none;" rhu-id="body">
                <ul rhu-id="slotList" class="player-info-loadout" style="display: flex; flex-direction: column;">
                    <li style="padding: 0;">
                        <button rhu-id="name" style="width: 100%; --color: #dadad1;"></button>
                    </li>
                    <li style="position: relative;">
                        <ul class="achievement" rhu-id="achievements" style="display: flex; padding-top: 0.5rem;">
                        </ul>
                        <div class="achievements">
                            <h3 rhu-id="achievementName" style="
                                font-family: 'Share Tech Mono';
                                margin-bottom: 0.4rem;
                            "></h3>
                            <span rhu-id="achievementAlt" style="font-family: 'Share Tech Mono'; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;"></span>
                        </div>
                    </li>
                    <li>
                        <div rhu-id="main"></div>
                        <div style="flex:1"></div>
                        <img rhu-id="mainImg"src=""/>
                    </li>
                    <li>
                        <div rhu-id="secondary"></div>
                        <div style="flex:1"></div>
                        <img rhu-id="secondaryImg"src=""/>
                    </li>
                    <li>
                        <div rhu-id="tool"></div>
                        <div style="flex:1"></div>
                        <img rhu-id="toolImg"src=""/>
                    </li>
                    <li>
                        <div rhu-id="melee"></div>
                        <div style="flex:1"></div>
                        <img rhu-id="meleeImg" src=""/>
                    </li>
                </ul>
            </div>
            `, {
                element: //html
                `<div class="player-info"></div>`
            });

        let playerPanelFooter = function(this: playerPanelFooter)
        {
        } as Function as playerPanelFooterConstructor;
        RHU.Macro(playerPanelFooter, "playerPanelFooter", //html
            `
            
            `, {
                element: //html
                `<div style="width: 100%; flex: 1; background-color: black; padding: 4rem; padding-top: 14rem;"></div>`
            })

        let playerPanel = function(this: playerPanel)
        {
            const self = this;

            this.footer = document.createMacro("playerPanelFooter");
            this.footer.panel = this;

            this.slots = [this.slot0, this.slot1, this.slot2, this.slot3];
            for (let slot of this.slots)
            {
                slot.panel = this;
            }

            this.resize = function() {
                let computed = getComputedStyle(self.slot0);
                let computedSlot = getComputedStyle(self.slot0.slotList);
                self.footer.style.paddingTop = `calc(${parseInt(computedSlot.height) - parseInt(computed.height)}px + 4rem)`;
            };
            window.addEventListener("resize", this.resize);
        } as Function as playerPanelConstructor;
        playerPanel.prototype.reset = function()
        {
            this.vid.play();
            mount.body.append(this.footer);

            if (!RHU.exists(mount.report)) return;

            let slotIdx = 0;
            for (let player of mount.report.players.values())
                this.slots[slotIdx++].load(player);
        }
        RHU.Macro(playerPanel, "playerPanel", //html
            `
            <div style="position: relative; width: 100%; aspect-ratio: 2.25;/*max-height: 400px;*/">
                <video rhu-id="vid" class="player-video" autoplay loop playsinline disablepictureinpicture poster="https://storage.googleapis.com/gtfo-prod-v1/lobby_test_2_00000_a4b0da3c99/lobby_test_2_00000_a4b0da3c99.jpg">
                    <source src="https://storage.googleapis.com/gtfo-prod-v1/lobby_FIX_8cbec4587d/lobby_FIX_8cbec4587d.mp4" type="video/mp4">
                </video>
                <div style="position: relative; height: 100%; aspect-ratio: 2.25; margin: auto;">
                    <rhu-macro rhu-id="slot0" style="top: 40%; left: 15%;" rhu-type="playerInfo"></rhu-macro>
                    <rhu-macro rhu-id="slot1" style="top: 40%; left: 37%;" rhu-type="playerInfo"></rhu-macro>
                    <rhu-macro rhu-id="slot2" style="top: 40%; left: 59%;" rhu-type="playerInfo"></rhu-macro>
                    <rhu-macro rhu-id="slot3"style="top: 40%; left: 80%;" rhu-type="playerInfo"></rhu-macro>
                </div>
            </div>
            `, {
                element: //html
                `<div style="display: flex; flex-direction: column; height: 100%; width: 100%; position: relative;" class=""></div>`
            });

        let enemyPanel = function(this: enemyPanel)
        {

        } as Function as enemyPanelConstructor;
        enemyPanel.prototype.reset = function()
        {
            if (!RHU.exists(mount.report)) return;

            this.list.load(mount.report);
        }
        RHU.Macro(enemyPanel, "enemyPanel", //html
            `
            <div class="margins-wrapper">
                <rhu-macro rhu-id="list" rhu-type="enemyList"></rhu-macro>
            </div>
            `, {
                element: //html
                `<div class="margins"></div>`
            });

        let reportmount = function(this: reportmount)
        {
            mount = this;

            const self = this;

            this.view = "players";
            this.report = null;

            this.navbar = [
                {
                    btn: this.playersBtn, 
                    panel: document.createMacro("playerPanel")
                }, 
                {
                    btn: this.enemiesBtn,
                    panel: document.createMacro("enemyPanel")
                }
            ];
            let navbar = this.navbar;
            for (let { btn, panel } of navbar)
            {
                btn.onclick = function()
                {
                    for (let { btn } of navbar)
                    {
                        btn.classList.toggle("selected", false);
                    }
                    btn.classList.toggle("selected", true);
                    self.body.replaceChildren(panel);
                    requestAnimationFrame(() => { panel.reset(); });
                }
            }
            navbar[0].btn.click();
        } as reportmountConstructor;
        reportmount.prototype.open = function(report: GTFOReport)
        {
            this.report = report;
        }
        RHU.Macro(reportmount, "report", //html
            `
            <!-- navbar -->
            <ul class="report-navbar">
                <li class="selected" rhu-id="playersBtn">
                    <a>Players</a>
                </li>
                <li rhu-id="enemiesBtn">
                    <a>Enemies</a>
                </li>
            </ul>
            <div class="report-body" rhu-id="body">
            </div>
            `, {
                element: //html
                `<div class="report-mount"></div>`
            });
    }
}));
