declare namespace RHU { namespace Macro {
    interface TemplateMap
    {
        "graph": graph
    }
}}

interface graph extends HTMLDivElement
{
    player?: GTFOPlayerData;

    timeline: HTMLCanvasElement;
    snapshot: HTMLUListElement;

    ctx: CanvasRenderingContext2D;

    camera: {
        zoom: number,
        x: number,
        y: number
    };

    mouse: {
        left: boolean,
        right: boolean,
        x: number,
        y: number
    };

    render(): void;
    load(player: GTFOPlayerData): void;
}
interface graphConstructor extends RHU.Macro.Constructor<graph>
{
    
}

RHU.import(RHU.module({ trace: new Error(),
    name: "Report", hard: ["RHU.Macro", "RHU.Rest"],
    callback: function()
    {
        let { RHU } = window.RHU.require(window, this);

        let graph = function(this: graph)
        {
            this.camera = {
                zoom: 1,
                x: 0,
                y: 0
            };

            this.ctx = this.timeline.getContext("2d")!;
            
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
            let old = { x: 0, y: 0 };
            this.timeline.addEventListener("mousedown", () => {
                this.mouse.left = true;
                old.x = this.mouse.x;
                old.y = this.mouse.y;
            });
            this.timeline.addEventListener("mousemove", (e) => {
                let rect = this.timeline.getBoundingClientRect();
                this.mouse.x = e.clientX - rect.left;
                this.mouse.y = e.clientY - rect.top;

                if (this.mouse.left)
                {
                    this.camera.x += old.x - this.mouse.x;
                    old.x = this.mouse.x;
                }

                this.render();
            });
            this.timeline.addEventListener("mouseup", () => {
                this.mouse.left = false;
            });
            this.timeline.addEventListener("wheel", (e) => {
                if (this.mouse.y > this.timeline.height / 2 - 100 &&
                    this.mouse.y < this.timeline.height / 2 + 100)
                {
                    e.preventDefault();

                    let zoom = this.camera.zoom;
                    this.camera.zoom -= e.deltaY * 0.0005;
                    if (this.camera.zoom < 0.0001)
                    this.camera.zoom = 0.0001;
                    let old = this.mouse.x + this.camera.x - this.timeline.width / 2;
                    let delta = old / zoom * this.camera.zoom;
                    this.camera.x += delta - old;
                    this.render();
                }
            });
        } as Function as graphConstructor;
        graph.prototype.render = function()
        {
            let computed = getComputedStyle(this.timeline);
            this.timeline.width = parseInt(computed.width);
            this.timeline.height = parseInt(computed.height);

            if (this.timeline.width === 0) return;

            let w = this.timeline.width;
            let h = this.timeline.height;
            let ctx = this.ctx;

            ctx.clearRect(0, 0, w, h);

            if (RHU.exists(this.player))
            {
                const maximum = 100;
                const snapshotSize = 5 * 60 * 1000 / this.camera.zoom;
                const gridSize = 1;
                const timePerPixel = snapshotSize / w;
                const timePerGrid = timePerPixel * gridSize;
                const start = Math.floor((this.camera.x - w/2) / gridSize) * timePerGrid;
                const end = Math.ceil((this.camera.x + w/2) / gridSize) * timePerGrid;

                ctx.beginPath();
                ctx.moveTo(0, h/2 + maximum);
                ctx.lineTo(w, h/2 + maximum);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#dadad1";
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(0, h/2 - maximum);
                ctx.lineTo(w, h/2 - maximum);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#dadad1";
                ctx.stroke();

                ctx.translate(0, h/2);

                ctx.save();
                ctx.translate(w/2, 0);

                let value = this.player.healthMax;

                // Plot health
                if (true)
                {
                    let timeline = this.player.healthTimeline;

                    let index = 0;
                    for (; index < timeline.length; ++index)
                    {
                        if (timeline[index].timestamp > start)
                        {
                            if (index > 0) --index;
                            break;
                        }
                    }

                    let event = timeline[index];
                    let percentage = event.value / this.player.healthMax;
                    let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / timePerPixel) - this.camera.x;
                    
                    // Cursor value
                    if (x < this.mouse.x - w/2)
                        value = event.value;

                    // TODO(randomuserhi) => shift x to nearest grid point
                    ctx.beginPath();
                    let y = maximum - 2 * maximum * percentage;
                    ctx.moveTo(x, y);

                    ++index;
                    for (; index < timeline.length; ++index)
                    {
                        let event = timeline[index];
                        let percentage = event.value / this.player.healthMax;
                        let x = (Math.round(event.timestamp / timePerGrid) * timePerGrid / timePerPixel) - this.camera.x;

                        // Cursor value
                        if (x < this.mouse.x - w/2)
                            value = event.value;

                        // TODO(randomuserhi) => shift x to nearest grid point
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

                ctx.restore();

                ctx.beginPath();
                ctx.moveTo(this.mouse.x, -maximum - 20);
                ctx.lineTo(this.mouse.x, maximum + 20);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#dadad1";
                ctx.stroke();

                ctx.font = "20px Oxanium";
                let text = `${Math.round(value / this.player.healthMax * 100)}`;
                let metrics = ctx.measureText(text);
                ctx.strokeText(text, this.mouse.x - metrics.width / 2, - maximum - 40);
            }
        };
        graph.prototype.load = function(player: GTFOPlayerData)
        {
            this.player = player;
            this.render();
        }
        RHU.Macro(graph, "graph", //html
            `
            <canvas rhu-id="timeline" style="width: 100%; height: 70vh;"></canvas>
            <ul rhu-id="snapshot">
            </ul>
            `, {
                element: //html
                `<div></div>`
            });
    }
}));