RHU.import(RHU.module({ trace: new Error(),
    name: "Report", hard: ["RHU.Macro", "RHU.Rest"],
    callback: function () {
        let { RHU } = window.RHU.require(window, this);
        let GTFOIcons = new Map();
        if (true) {
            let img = new Image();
            img.src = "./icons/general/checkpoint.png";
            GTFOIcons.set("checkpoint", img);
        }
        let graph = function () {
            this.GTFOEnemyIcons = new Map();
            this.GTFOGearIcons = new Map();
            this.GTFOPackIcons = new Map();
            this.camera = {
                zoom: 1,
                x: 0,
                y: 0
            };
            this.selected = null;
            this.selectedEvents = [];
            this.timeline.addEventListener("contextmenu", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            this.ctx = this.timeline.getContext("2d");
            window.addEventListener("resize", () => {
                this.render();
            });
            this.render();
            this.mouse = {
                left: false,
                right: false,
                x: 0,
                y: 0
            };
            let origin = { x: 0, y: 0 };
            let old = { x: 0, y: 0 };
            this.timeline.addEventListener("mousedown", (e) => {
                e.preventDefault();
                if (e.button === 0) {
                    this.mouse.left = true;
                }
                else if (e.button === 2) {
                    let time = (this.mouse.x + this.camera.x - this.timeline.width / 2) * this.timePerPixel;
                    this.selected = { start: time, end: time };
                    this.mouse.right = true;
                }
                old.x = this.mouse.x;
                old.y = this.mouse.y;
                origin.x = this.mouse.x;
                origin.y = this.mouse.y;
            });
            this.timeline.addEventListener("mousemove", (e) => {
                e.preventDefault();
                let rect = this.timeline.getBoundingClientRect();
                this.mouse.x = e.clientX - rect.left;
                this.mouse.y = e.clientY - rect.top;
                if (this.mouse.left) {
                    this.camera.x += old.x - this.mouse.x;
                    old.x = this.mouse.x;
                }
                else if (this.mouse.right) {
                    if (RHU.exists(this.selected)) {
                        let time = (this.mouse.x + this.camera.x - this.timeline.width / 2) * this.timePerPixel;
                        this.selected.end = time;
                    }
                }
                this.render();
            });
            this.timeline.addEventListener("mouseup", (e) => {
                e.preventDefault();
                if (e.button === 0) {
                    this.mouse.left = false;
                    if (this.mouse.x === origin.x && this.mouse.y === origin.y) {
                        this.selected = null;
                        this.render();
                    }
                }
                else if (e.button === 2) {
                    this.mouse.right = false;
                    if (this.mouse.x === origin.x && this.mouse.y === origin.y) {
                        this.selected = null;
                        this.render();
                    }
                }
            });
            this.timeline.addEventListener("wheel", (e) => {
                if (this.mouse.y > this.timeline.height / 2 - 100 &&
                    this.mouse.y < this.timeline.height / 2 + 100) {
                    e.preventDefault();
                    let zoom = this.camera.zoom;
                    this.camera.zoom -= e.deltaY * 0.002;
                    if (this.camera.zoom < 0.01)
                        this.camera.zoom = 0.01;
                    let old = this.mouse.x + this.camera.x - this.timeline.width / 2;
                    let delta = old / zoom * this.camera.zoom;
                    this.camera.x += delta - old;
                    this.render();
                }
            });
        };
        graph.prototype.render = function () {
            let computed = getComputedStyle(this.timeline);
            this.timeline.width = parseInt(computed.width);
            this.timeline.height = parseInt(computed.height);
            if (this.timeline.width === 0)
                return;
            let w = this.timeline.width;
            let h = this.timeline.height;
            let ctx = this.ctx;
            ctx.clearRect(0, 0, w, h);
            if (RHU.exists(this.player) && RHU.exists(this.report)) {
                const maximum = 100;
                const snapshotSize = 10 * 60 * 1000 / this.camera.zoom;
                const gridSize = 1;
                this.timePerPixel = snapshotSize / w;
                const timePerGrid = this.timePerPixel * gridSize;
                const start = Math.floor((this.camera.x - w / 2) / gridSize) * timePerGrid;
                const end = Math.ceil((this.camera.x + w / 2) / gridSize) * timePerGrid;
                ctx.beginPath();
                ctx.moveTo(0, h / 2 + maximum);
                ctx.lineTo(w, h / 2 + maximum);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#dadad1";
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, h / 2 - maximum);
                ctx.lineTo(w, h / 2 - maximum);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#dadad1";
                ctx.stroke();
                ctx.translate(0, h / 2);
                ctx.save();
                ctx.translate(w / 2, 0);
                let health = this.player.healthMax;
                let infection = 0;
                if (true) {
                    let timeline = this.player.healthTimeline;
                    let index = 0;
                    for (; index < timeline.length; ++index) {
                        if (timeline[index].timestamp > start) {
                            if (index > 0)
                                --index;
                            break;
                        }
                    }
                    let event = timeline[index];
                    let percentage = event.value / this.player.healthMax;
                    let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / this.timePerPixel) - this.camera.x;
                    if (x < this.mouse.x - w / 2)
                        health = event.value;
                    ctx.beginPath();
                    let y = maximum - 2 * maximum * percentage;
                    ctx.moveTo(x, y);
                    ++index;
                    for (; index < timeline.length; ++index) {
                        let event = timeline[index];
                        let percentage = event.value / this.player.healthMax;
                        let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / this.timePerPixel) - this.camera.x;
                        if (x < this.mouse.x - w / 2)
                            health = event.value;
                        ctx.lineTo(x, y);
                        y = maximum - 2 * maximum * percentage;
                        ctx.lineTo(x, y);
                        if (timeline[index].timestamp > end)
                            break;
                    }
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "red";
                    ctx.stroke();
                }
                if (this.player.infectionTimeline.filter((i) => i.value != 0).length > 0) {
                    let timeline = this.player.infectionTimeline;
                    let index = 0;
                    for (; index < timeline.length; ++index) {
                        if (timeline[index].timestamp > start) {
                            if (index > 0)
                                --index;
                            break;
                        }
                    }
                    let event = timeline[index];
                    let percentage = 1 - event.value;
                    let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / this.timePerPixel) - this.camera.x;
                    if (x < this.mouse.x - w / 2)
                        infection = event.value;
                    ctx.beginPath();
                    let y = maximum - 2 * maximum * percentage;
                    ctx.moveTo(x, y);
                    ++index;
                    for (; index < timeline.length; ++index) {
                        let event = timeline[index];
                        let percentage = 1 - event.value;
                        let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / this.timePerPixel) - this.camera.x;
                        if (x < this.mouse.x - w / 2)
                            infection = event.value;
                        ctx.lineTo(x, y);
                        y = maximum - 2 * maximum * percentage;
                        ctx.lineTo(x, y);
                        if (timeline[index].timestamp > end)
                            break;
                    }
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "green";
                    ctx.stroke();
                }
                if (true) {
                    let timeline = this.player.stateTimeline;
                    let index = 0;
                    for (; index < timeline.length; ++index) {
                        if (timeline[index].timestamp > start) {
                            if (index > 0)
                                --index;
                            break;
                        }
                    }
                    for (; index < timeline.length; ++index) {
                        let event = timeline[index];
                        let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / this.timePerPixel) - this.camera.x;
                        if (event.type !== "Checkpoint") {
                            ctx.beginPath();
                            ctx.moveTo(x, -maximum - 20);
                            ctx.lineTo(x, maximum + 20);
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = "rgba(233, 188, 41, 1)";
                            ctx.stroke();
                        }
                        else {
                            ctx.beginPath();
                            ctx.moveTo(x, -maximum - 20);
                            ctx.lineTo(x, maximum + 20);
                            ctx.lineWidth = 1;
                            ctx.strokeStyle = "rgba(80, 212, 120, 0.5)";
                            ctx.stroke();
                            if (GTFOIcons.has("checkpoint")) {
                                ctx.drawImage(GTFOIcons.get("checkpoint"), x - 25, -maximum - 150, 50, 50);
                            }
                        }
                        if (timeline[index].timestamp > end)
                            break;
                    }
                }
                if (true) {
                    let timeline = this.player.damageTimeline;
                    let index = 0;
                    for (; index < timeline.length; ++index) {
                        if (timeline[index].timestamp > start) {
                            if (index > 0)
                                --index;
                            break;
                        }
                    }
                    for (; index < timeline.length; ++index) {
                        let event = timeline[index];
                        let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / this.timePerPixel) - this.camera.x;
                        ctx.beginPath();
                        ctx.moveTo(x, -maximum - 20);
                        ctx.lineTo(x, maximum + 20);
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "rgba(218, 218, 216, 0.3)";
                        ctx.stroke();
                        if (RHU.exists(event.enemyInstanceID)) {
                            let enemy = this.report.enemies.get(event.enemyInstanceID);
                            if (RHU.exists(enemy) && this.GTFOEnemyIcons.has(enemy.type)) {
                                ctx.drawImage(this.GTFOEnemyIcons.get(enemy.type), x - 25, maximum + 80, 50, 50);
                            }
                        }
                        else if (RHU.exists(event.playerID) && RHU.exists(event.gearName)) {
                            if (this.GTFOGearIcons.has(event.gearName)) {
                                ctx.drawImage(this.GTFOGearIcons.get(event.gearName), x - 25, maximum + 80, 50, 50);
                            }
                        }
                        if (timeline[index].timestamp > end)
                            break;
                    }
                }
                if (true) {
                    let timeline = this.player.packsTimeline;
                    let index = 0;
                    for (; index < timeline.length; ++index) {
                        if (timeline[index].timestamp > start) {
                            if (index > 0)
                                --index;
                            break;
                        }
                    }
                    for (; index < timeline.length; ++index) {
                        let event = timeline[index];
                        let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / this.timePerPixel) - this.camera.x;
                        ctx.beginPath();
                        ctx.moveTo(x, -maximum - 20);
                        ctx.lineTo(x, maximum + 20);
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "rgba(233, 188, 41, 0.5)";
                        ctx.stroke();
                        if (this.GTFOPackIcons.has(event.type)) {
                            ctx.drawImage(this.GTFOPackIcons.get(event.type), x - 25, -maximum - 150, 50, 50);
                        }
                        if (timeline[index].timestamp > end)
                            break;
                    }
                }
                if (RHU.exists(this.selected)) {
                    let x1 = (this.selected.start / this.timePerPixel) - this.camera.x;
                    let x2 = (this.selected.end / this.timePerPixel) - this.camera.x;
                    if (x1 > x2) {
                        let temp = x1;
                        x1 = x2;
                        x2 = temp;
                    }
                    ctx.fillStyle = "rgba(218, 218, 216, 0.3)";
                    ctx.fillRect(x1, -maximum, x2 - x1, maximum * 2);
                }
                ctx.restore();
                ctx.beginPath();
                ctx.moveTo(this.mouse.x, -maximum - 20);
                ctx.lineTo(this.mouse.x, maximum + 20);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#dadad1";
                ctx.stroke();
                ctx.font = "20px Oxanium";
                let text = `${Math.round(health / this.player.healthMax * 100)}`;
                let metrics = ctx.measureText(text);
                ctx.fillStyle = "#dadad1";
                ctx.fillText(text, this.mouse.x - metrics.width / 2, -maximum - 40);
                let time = (this.mouse.x + this.camera.x - w / 2) * this.timePerPixel;
                if (time > 0) {
                    ctx.font = "20px Oxanium";
                    let seconds = Math.floor(time / 1000);
                    let minutes = Math.floor(seconds / 60);
                    let hours = Math.floor(minutes / 60);
                    let s = seconds - minutes * 60;
                    let m = minutes - hours * 60;
                    if (hours > 0)
                        text = `${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    else
                        text = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    metrics = ctx.measureText(text);
                    ctx.fillStyle = "#dadad1";
                    ctx.fillText(text, this.mouse.x - metrics.width / 2, maximum + 60);
                }
                if (infection != 0) {
                    ctx.font = "20px Oxanium";
                    text = `${Math.round(infection * 100)}`;
                    metrics = ctx.measureText(text);
                    ctx.fillStyle = "green";
                    ctx.fillText(text, this.mouse.x - metrics.width / 2, -maximum - 60);
                }
            }
            if (RHU.exists(this.selected) && RHU.exists(this.player)) {
                let selectedEvents = [];
                let timeline = this.player.timeline;
                let start = this.selected.start;
                let end = this.selected.end;
                let i = 0;
                let doUpdate = false;
                if (start > end) {
                    let temp = start;
                    start = end;
                    end = temp;
                }
                let index = 0;
                for (; index < timeline.length; ++index) {
                    if (timeline[index].event.timestamp > start)
                        break;
                }
                for (; index < timeline.length; ++index) {
                    if (timeline[index].event.timestamp > end)
                        break;
                    selectedEvents.push(timeline[index]);
                    if (timeline[index] !== this.selectedEvents[i++])
                        doUpdate = true;
                }
                if (doUpdate || selectedEvents.length !== this.selectedEvents.length) {
                    this.selectedEvents = selectedEvents;
                    this.updateSnapshot(this.selectedEvents);
                }
            }
            else
                this.updateSnapshot();
        };
        graph.prototype.updateSnapshot = function (timeline) {
            this.snapshot.replaceChildren();
            if (!RHU.exists(timeline))
                return;
            if (!RHU.exists(this.report))
                return;
            if (!RHU.exists(this.player))
                return;
            if (!RHU.exists(this.selected))
                return;
            let report = this.report;
            let self = this.player;
            let fragment = new DocumentFragment();
            if (true) {
                let item;
                let time;
                let value;
                let lastEvent;
                const timeMergeWindow = 1 * 1000;
                let reset = () => {
                    item = document.createElement("li");
                    item.style.display = `flex`;
                    item.style.gap = `1rem`;
                    item.style.alignItems = `center`;
                    time = document.createElement("span");
                    time.style.color = "#c8ad62";
                    value = 0;
                    lastEvent = undefined;
                };
                reset();
                let closeLastEvent = (wrapper) => {
                    let closeDamage = (e) => {
                        let timestr = timeToString(e.timestamp);
                        if (timestr !== time.innerHTML)
                            time.innerHTML += ` - ${timestr}:`;
                        else
                            time.innerHTML += `:`;
                        let img = document.createElement("img");
                        img.style.width = `4rem`;
                        if (RHU.exists(e.enemyInstanceID)) {
                            img.style.width = `3rem`;
                            let enemy = report.enemies.get(e.enemyInstanceID);
                            if (RHU.exists(enemy))
                                img.src = `./icons/enemies/${enemy.type}.png`;
                        }
                        else if (e.type === "PlayerBullet" || e.type === "PlayerExplosive") {
                            img.src = `./icons/gear/${e.gearName}.webp`;
                        }
                        let content = document.createElement("span");
                        content.innerHTML = `<span style="font-weight: 800;">${Math.round(value / self.healthMax * 100)}</span> damage dealt by`;
                        item.append(time, content, img);
                        if (RHU.exists(e.enemyInstanceID)) {
                            let enemy = report.enemies.get(e.enemyInstanceID);
                            if (RHU.exists(enemy)) {
                                let a = document.createElement("a");
                                a.innerHTML = `${enemy.name} (${e.type})`;
                                a.addEventListener("click", () => {
                                    mount.enemiesBtn.click();
                                    requestAnimationFrame(() => {
                                        if (RHU.exists(enemy))
                                            mount.navbar[1].panel.list.goTo(enemy.name);
                                    });
                                });
                                item.append(a);
                            }
                        }
                        else {
                            let player = report.allPlayers.get(e.playerID);
                            if (RHU.exists(player)) {
                                let name = document.createElement("span");
                                name.innerHTML = player.name;
                                name.style.color = "#e9bc29";
                                item.append(name);
                            }
                        }
                        fragment.append(item);
                        reset();
                    };
                    if (RHU.exists(lastEvent)) {
                        if (RHU.exists(wrapper))
                            switch (wrapper.type) {
                                case "packs":
                                    if (true) {
                                        switch (lastEvent.type) {
                                            case "damage":
                                                closeDamage(lastEvent.event);
                                                break;
                                        }
                                    }
                                    break;
                                case "state":
                                    if (true) {
                                        switch (lastEvent.type) {
                                            case "damage":
                                                closeDamage(lastEvent.event);
                                                break;
                                        }
                                    }
                                    break;
                                case "damage":
                                    if (true) {
                                        let e = wrapper.event;
                                        let last = lastEvent.event;
                                        if (e.type === "FallDamage") {
                                            closeDamage(last);
                                        }
                                        else {
                                            switch (lastEvent.type) {
                                                case "damage":
                                                    if (e.type !== last.type || e.timestamp - last.timestamp > timeMergeWindow)
                                                        closeDamage(last);
                                                    else if (RHU.exists(e.enemyInstanceID)) {
                                                        if (e.enemyInstanceID !== last.enemyInstanceID)
                                                            closeDamage(last);
                                                    }
                                                    else {
                                                        if (e.gearName !== last.gearName || e.playerID !== last.playerID)
                                                            closeDamage(last);
                                                    }
                                                    break;
                                            }
                                        }
                                    }
                                    break;
                            }
                        else {
                            switch (lastEvent.type) {
                                case "damage":
                                    closeDamage(lastEvent.event);
                                    break;
                            }
                        }
                    }
                };
                for (let index = 0; index < timeline.length; ++index) {
                    let doReset = false;
                    let event = timeline[index];
                    closeLastEvent(event);
                    switch (event.type) {
                        case "packs":
                            if (true) {
                                let e = event.event;
                                time.innerHTML = `${timeToString(e.timestamp)}:`;
                                let img = document.createElement("img");
                                img.style.width = `4rem`;
                                img.src = `./icons/packs/${e.type}.webp`;
                                let content = document.createElement("span");
                                let text = "";
                                if (RHU.exists(e.playerID) && e.playerID !== self.playerID) {
                                    let player = report.allPlayers.get(e.playerID);
                                    if (RHU.exists(player))
                                        text += `given by <span>${player.name}</span>`;
                                }
                                else
                                    text = "consumed";
                                content.innerHTML = text;
                                item.append(time, img, content);
                                fragment.append(item);
                                doReset = true;
                            }
                            break;
                        case "state":
                            if (true) {
                                let e = event.event;
                                time.innerHTML = `${timeToString(e.timestamp)}:`;
                                let content = document.createElement("span");
                                switch (e.type) {
                                    case "Down":
                                        content.innerHTML = `<span style="color: #e9bc29;">${self.name}</span> was <span>downed</span>`;
                                        break;
                                    case "Revive":
                                        if (RHU.exists(e.playerID)) {
                                            let player = report.allPlayers.get(e.playerID);
                                            if (RHU.exists(player))
                                                content.innerHTML = `<span style="color: #e9bc29;">${self.name}</span> was <span>revived</span> by <span style="color: #e9bc29;">${player.name}</span>`;
                                        }
                                        break;
                                    case "Checkpoint":
                                        content.innerHTML = `<span style="color: rgb(80, 212, 120);">Checkpoint reloaded</span>`;
                                        break;
                                }
                                item.append(time, content);
                                fragment.append(item);
                                doReset = true;
                            }
                            break;
                        case "damage":
                            if (true) {
                                let e = event.event;
                                if (!RHU.exists(lastEvent))
                                    time.innerHTML = `${timeToString(e.timestamp)}`;
                                value += e.damage;
                                if (e.type === "FallDamage") {
                                    item.append(time, document.createTextNode(`${Math.round(value / self.healthMax * 100)} fall damage taken`));
                                    fragment.append(item);
                                    reset();
                                }
                            }
                            break;
                    }
                    lastEvent = event;
                    if (doReset)
                        reset();
                }
                closeLastEvent();
            }
            this.snapshot.append(fragment);
        };
        graph.prototype.load = function (player, report) {
            this.report = report;
            this.player = player;
            this.GTFOEnemyIcons.clear();
            for (let name in report.spec.enemies) {
                let enemy = report.spec.enemies[name];
                if (!this.GTFOEnemyIcons.has(enemy.type)) {
                    let image = new Image();
                    this.GTFOEnemyIcons.set(enemy.type, image);
                    image.src = `./icons/enemies/${enemy.type}.png`;
                }
            }
            this.GTFOGearIcons.clear();
            for (let name in report.spec.gear) {
                let gear = report.spec.gear[name];
                if (!this.GTFOGearIcons.has(gear.publicName)) {
                    let image = new Image();
                    this.GTFOGearIcons.set(gear.publicName, image);
                    image.src = `./icons/gear/${gear.publicName}.webp`;
                }
            }
            this.GTFOPackIcons.clear();
            for (let name in report.spec.packs) {
                let pack = report.spec.packs[name];
                if (!this.GTFOPackIcons.has(pack)) {
                    let image = new Image();
                    this.GTFOPackIcons.set(pack, image);
                    image.src = `./icons/packs/${pack}.webp`;
                }
            }
            this.render();
        };
        RHU.Macro(graph, "graph", `
            <canvas rhu-id="timeline" style="width: 100%; height: 70vh;"></canvas>
            <div class="margins">
                <div class="margins-wrapper">
                    <ul rhu-id="snapshot" style="display: flex; flex-direction:column; gap: 1rem;">
                    </ul>
                </div>
            </div>
            `, {
            element: `<div></div>`
        });
    }
}));
