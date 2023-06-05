interface reportmount extends HTMLDivElement
{
    open(report: GTFOReport): void;

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
    body: HTMLDivElement;
    disconnected: HTMLDivElement;

    name: HTMLButtonElement;

    slotList: HTMLUListElement;

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

    damageAvoided: HTMLSpanElement;
    dodgetable: HTMLTableElement;
}
interface playerSummaryConstructor extends RHU.Macro.Constructor<playerSummary>
{

}

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

            this.timeline.load(player);

            if (damageAvoided > 0)
                this.dodgetable.style.display = "block";
        }
        RHU.Macro(playerSummary, "playerSummary", //html
            `
            <h2 style="display: flex; gap: 3rem; align-items: center; margin-bottom: 1rem;">
                <span>Timeline:</span>
            </h2>
            <div style="margin-bottom: 2rem;">
                <rhu-macro rhu-id="timeline" rhu-type="graph"></rhu-macro>
            </div>
            <h2 style="display: flex; gap: 3rem; align-items: center; margin-bottom: 1rem;">
                <span>Resources</span>
            </h2>
            <div style="margin-bottom: 2rem;">
                <ul style="display: flex; gap: 2.5rem;">
                    <li style="display: flex; gap: 1rem; align-items: center;">
                        <img style="width: 4rem;" src="./icons/packs/Medi.webp"/>
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
            this.assists.innerHTML = `${gear.enemies.size - total}`;

            if (total > 0)
                this.body.style.display = "block";
        }
        RHU.Macro(gearRecap, "gearRecap", //html
            `
            <h2 style="display: flex; gap: 3rem; align-items: center; margin-bottom: 1rem;">
                <img rhu-id="img" style="height: 4rem;" src=""/>
                <span rhu-id="name">UNKNOWN</span>
            </h2>
            <div style="display: flex;">
                <div style="flex: 0.7; padding-right: 1.5rem;">
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
                <div style="flex: 1; padding-left: 2rem;">
                    <!-- TODO -->
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
            <h1 rhu-id="name" style="padding-top: 2rem;">DISCONNECTED</h1>
            <div rhu-id="body" style="display: none;">
                <rhu-macro rhu-id="summary" rhu-type="playerSummary" style="margin-top: 2rem;">
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

            this.full.load(player.playerID);
        };
        RHU.Macro(playerInfo, "playerInfo", //html
            `
            <div style="display: block; padding: 1rem; color: #e11900" rhu-id="disconnected">
                DISCONNECTED
            </div>
            <div style="display: none;" rhu-id="body">
                <ul rhu-id="slotList" class="player-info-loadout" style="display: flex; flex-direction: column; gap: 1rem;">
                    <li style="padding: 0;">
                        <button rhu-id="name" style="width: 100%; --color: #dadad1;"></button>
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
        RHU.Macro(enemyPanel, "enemyPanel", //html
            `
            ENEMIES
            `, {
                element: //html
                `<div class=""></div>`
            });

        let mount: reportmount;
        let reportmount = function(this: reportmount)
        {
            mount = this;

            const self = this;

            this.view = "players";
            this.report = null;

            let navbar: {btn: HTMLElement, panel: Panel}[] = [
                {
                    btn: this.playersBtn, 
                    panel: document.createMacro("playerPanel")
                }, 
                {
                    btn: this.enemiesBtn,
                    panel: document.createMacro("enemyPanel")
                }
            ];
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
