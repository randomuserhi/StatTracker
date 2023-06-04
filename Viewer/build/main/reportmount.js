RHU.import(RHU.module({ trace: new Error(),
    name: "Report", hard: ["RHU.Macro", "RHU.Rest"],
    callback: function () {
        let { RHU } = window.RHU.require(window, this);
        let playerSummary = function () {
        };
        playerSummary.prototype.load = function (id) {
            let report = mount.report;
            let spec = report.spec;
            let player = report.players.get(id);
            let damageAvoided = 0;
            let dodges = {};
            for (let event of player.dodges) {
                let enemy = report.enemies.get(event.enemyInstanceID);
                if (!RHU.exists(enemy)) {
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
            if (true) {
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
            for (let type in dodges) {
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
        };
        RHU.Macro(playerSummary, "playerSummary", `
            <h2 style="display: flex; gap: 3rem; align-items: center; margin-bottom: 1rem;">
                <span rhu-id="name">Dodges</span>
            </h2>
            <div style="display: flex;">
                <div style="flex: 0.7; padding-right: 1.5rem;">
                    <div style="margin-bottom: 1rem">
                        <ul style="display: flex; gap: 2.5rem;">
                            <li style="flex: 1; display: flex;">
                                Damage Avoided <div style="flex: 0.1"></div> <span style="color: #e9bc29;" rhu-id="damageAvoided">0</span> <div style="flex: 0.9"></div>
                            </li>
                            <li style="flex: 1; display: flex">
                                
                            </li>
                            <li style="flex: 1; display: flex">
                                
                            </li>
                        </ul>
                    </div>
                    <table rhu-id="dodgetable">
                    </table>
                </div>
                <div style="flex: 1; padding-left: 2rem;">
                    Crazy
                </div>
            </div>
            `, {
            element: `<div></div>`
        });
        let gearRecap = function () {
        };
        gearRecap.prototype.load = function (id, gearID) {
            let report = mount.report;
            let player = report.players.get(id);
            let gear = player.gears[gearID];
            this.name.innerHTML = gearID;
            this.img.src = `./icons/gear/${gearID}.webp`;
            let kills = report.getPlayerGearKills(id, gearID);
            let total = 0;
            let fragment = new DocumentFragment();
            if (true) {
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
            for (let type in kills) {
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
            this.damage.innerHTML = `${gear.damage.toFixed(2)}`;
            this.kills.innerHTML = `${total}`;
            this.assists.innerHTML = `${gear.enemies.size - total}`;
            this.body.style.display = "block";
        };
        RHU.Macro(gearRecap, "gearRecap", `
            <h2 style="display: flex; gap: 3rem; align-items: center; margin-bottom: 1rem;">
                <img rhu-id="img" style="height: 4rem;" src=""/>
                <span rhu-id="name">UNKNOWN</span>
            </h2>
            <div style="display: flex;">
                <div style="flex: 0.7; padding-right: 1.5rem;">
                    <div style="margin-bottom: 1rem">
                        <ul style="display: flex; gap: 2.5rem;">
                            <li style="flex: 1; display: flex;">
                                Damage <div style="flex: 0.1;"></div> <span style="color: #e9bc29;" rhu-id="damage">0</span>
                            </li>
                            <li style="flex: 1; display: flex">
                                Kills <div style="flex: 0.1;"></div> <span rhu-id="kills">0</span>
                            </li>
                            <li style="flex: 1; display: flex">
                                Assists <div style="flex: 0.1;"></div> <span rhu-id="assists">0</span>
                            </li>
                        </ul>
                    </div>
                    <div rhu-id="body" style="display: none;">
                        <table rhu-id="killtable">
                        </table>
                    </div>
                </div>
                <div style="flex: 1; padding-left: 2rem;">
                    Crazy
                </div>
            </div>
            `, {
            element: `<li></li>`
        });
        let playerInfoFull = function () {
        };
        playerInfoFull.prototype.load = function (id) {
            let report = mount.report;
            let player = report.allPlayers.get(id);
            if (!RHU.exists(player))
                return;
            this.name.innerHTML = player.name;
            this.body.style.display = "block";
            this.summary.load(player.playerID);
            let loadout = report.getLoadout(player.playerID);
            if (RHU.exists(loadout.main)) {
                let recap = document.createMacro("gearRecap");
                this.gears.append(recap);
                recap.load(player.playerID, loadout.main.publicName);
            }
            if (RHU.exists(loadout.secondary)) {
                let recap = document.createMacro("gearRecap");
                this.gears.append(recap);
                recap.load(player.playerID, loadout.secondary.publicName);
            }
            if (RHU.exists(loadout.tool)) {
                let recap = document.createMacro("gearRecap");
                this.gears.append(recap);
                recap.load(player.playerID, loadout.tool.publicName);
            }
            if (RHU.exists(loadout.melee)) {
                let recap = document.createMacro("gearRecap");
                this.gears.append(recap);
                recap.load(player.playerID, loadout.melee.publicName);
            }
        };
        RHU.Macro(playerInfoFull, "playerInfoFull", `
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
            element: `<div></div>`
        });
        let playerInfo = function () {
            const self = this;
            this.full = document.createMacro("playerInfoFull");
            this.addEventListener("click", function () {
                self.panel.footer.replaceChildren(self.full);
                self.panel.resize();
                self.full.scrollIntoView({ behavior: "smooth" });
            });
        };
        playerInfo.prototype.load = function (player) {
            this.disconnected.style.display = "none";
            this.body.style.display = "block";
            this.name.innerHTML = player.name;
            let report = mount.report;
            let loadout = report.getLoadout(player.playerID);
            if (RHU.exists(loadout.main)) {
                this.main.innerHTML = loadout.main.publicName;
                this.mainImg.src = `./icons/gear/${loadout.main.publicName}.webp`;
            }
            if (RHU.exists(loadout.secondary)) {
                this.secondary.innerHTML = loadout.secondary.publicName;
                this.secondaryImg.src = `./icons/gear/${loadout.secondary.publicName}.webp`;
            }
            if (RHU.exists(loadout.tool)) {
                this.tool.innerHTML = loadout.tool.publicName;
                this.toolImg.src = `./icons/gear/${loadout.tool.publicName}.webp`;
            }
            if (RHU.exists(loadout.melee)) {
                this.melee.innerHTML = loadout.melee.publicName;
                this.meleeImg.src = `./icons/gear/${loadout.melee.publicName}.webp`;
            }
            this.full.load(player.playerID);
        };
        RHU.Macro(playerInfo, "playerInfo", `
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
            element: `<div class="player-info"></div>`
        });
        let playerPanelFooter = function () {
        };
        RHU.Macro(playerPanelFooter, "playerPanelFooter", `
            
            `, {
            element: `<div style="width: 100%; flex: 1; background-color: black; padding: 4rem; padding-top: 14rem;"></div>`
        });
        let playerPanel = function () {
            const self = this;
            this.footer = document.createMacro("playerPanelFooter");
            this.footer.panel = this;
            this.slots = [this.slot0, this.slot1, this.slot2, this.slot3];
            for (let slot of this.slots) {
                slot.panel = this;
            }
            this.resize = function () {
                let computed = getComputedStyle(self.slot0);
                let computedSlot = getComputedStyle(self.slot0.slotList);
                self.footer.style.paddingTop = `calc(${parseInt(computedSlot.height) - parseInt(computed.height)}px + 4rem)`;
            };
            window.addEventListener("resize", this.resize);
        };
        playerPanel.prototype.reset = function () {
            this.vid.play();
            mount.body.append(this.footer);
            if (!RHU.exists(mount.report))
                return;
            let slotIdx = 0;
            for (let player of mount.report.players.values())
                this.slots[slotIdx++].load(player);
        };
        RHU.Macro(playerPanel, "playerPanel", `
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
            element: `<div style="display: flex; flex-direction: column; height: 100%; width: 100%; position: relative;" class=""></div>`
        });
        let enemyPanel = function () {
        };
        RHU.Macro(enemyPanel, "enemyPanel", `
            ENEMIES
            `, {
            element: `<div class=""></div>`
        });
        let mount;
        let reportmount = function () {
            mount = this;
            const self = this;
            this.view = "players";
            this.report = null;
            let navbar = [
                {
                    btn: this.playersBtn,
                    panel: document.createMacro("playerPanel")
                },
                {
                    btn: this.enemiesBtn,
                    panel: document.createMacro("enemyPanel")
                }
            ];
            for (let { btn, panel } of navbar) {
                btn.onclick = function () {
                    for (let { btn } of navbar) {
                        btn.classList.toggle("selected", false);
                    }
                    btn.classList.toggle("selected", true);
                    self.body.replaceChildren(panel);
                    requestAnimationFrame(() => { panel.reset(); });
                };
            }
            navbar[0].btn.click();
        };
        reportmount.prototype.open = function (report) {
            this.report = report;
        };
        RHU.Macro(reportmount, "report", `
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
            element: `<div class="report-mount"></div>`
        });
    }
}));
