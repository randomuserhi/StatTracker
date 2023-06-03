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
    }
}}

interface playerInfoFull extends HTMLDivElement
{
    body: HTMLDivElement;

    name: HTMLHeadingElement;
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

    kills: HTMLTableElement;
}
interface gearRecapConstructor extends RHU.Macro.Constructor<gearRecap>
{
    
}

RHU.import(RHU.module({ trace: new Error(),
    name: "Report", hard: ["RHU.Macro", "RHU.Rest"],
    callback: function()
    {
        let { RHU } = window.RHU.require(window, this);

        let gearRecap = function(this: gearRecap)
        {
        } as Function as gearRecapConstructor;
        gearRecap.prototype.load = function(id: string, gear: string): void
        {
            let report = mount.report!;

            this.name.innerHTML = gear;
            this.img.src = `./icons/gear/${gear}.webp`;

            let kills = report.getPlayerGearKills(id, gear);
            this.kills.replaceChildren();
            for (let type in kills)
            {
                let row = document.createElement("tr");
                let col0 = document.createElement("td");
                let col1 = document.createElement("td");
                col0.innerHTML = type;
                col1.style.paddingLeft = "2rem";
                col1.innerHTML = kills[type].toString();
                row.append(col0, col1);
                this.kills.append(row);
            }

            this.body.style.display = "block";
        }
        RHU.Macro(gearRecap, "gearRecap", //html
            `
            <h2 style="display: flex; gap: 3rem; align-items: center;">
                <img rhu-id="img" style="height: 4rem;" src=""/>
                <span rhu-id="name">UNKNOWN</span>
            </h2>
            <div rhu-id="body" style="display: none;">
                <table rhu-id="kills">
                </table>
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

            this.name.innerHTML = player?.name;

            this.body.style.display = "block";

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
            <h1 rhu-id="name">DISCONNECTED</h1>
            <div rhu-id="body" style="display: none;">
                <ul rhu-id="gears" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 2rem;">
                    <!-- gear recap -->
                </ul>
                <div style="margin-top: 2rem;">
                    <!-- TODO(randomuserhi) -->
                    <!-- damage taken timeline -->
                    <!-- health timeline -->
                    <!-- packs timeline -->
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
