RHU.import(RHU.module({ trace: new Error(),
    name: "Main", hard: ["RHU.Macro"],
    callback: function () {
        let { RHU } = window.RHU.require(window, this);
        let appmount = function () {
            const self = this;
            this.loadbtn.onclick = function () {
                self.load.click();
            };
            this.load.onclick = function () {
                self.load.value = "";
            };
            this.load.onchange = function (e) {
                try {
                    let files = e.target.files;
                    if (!files.length) {
                        console.warn('No file selected!');
                        return;
                    }
                    let file = files[0];
                    let reader = new FileReader();
                    reader.onload = (event) => {
                        if (RHU.exists(event.target)) {
                            let json = JSON.parse(event.target.result)[0];
                            let report = document.createMacro("report");
                            if (RHU.exists(self.report))
                                self.report.replaceWith(report);
                            else
                                self.append(report);
                            self.report = report;
                            self.report.open(new GTFOReport(json.reportType, json.report));
                            self.report.scrollIntoView({ behavior: "smooth" });
                        }
                    };
                    reader.readAsText(file);
                }
                catch (err) {
                    console.error(err);
                }
            };
        };
        RHU.Macro(appmount, "appmount", `
            <input style="display: none;" rhu-id="load" type="file" accept="application/json"/>
            <main class="main">
                <div class="attraction">
                    <video class="background-vid" muted autoplay loop playsinline disablepictureinpicture>
                        <source src="https://storage.googleapis.com/gtfo-prod-v1/Trailer_for_website_Pro_Res_2_H_264_24fef05909/Trailer_for_website_Pro_Res_2_H_264_24fef05909.mp4" type="video/mp4">
                    </video>    
                    <div class="attraction-body">
                        <button rhu-id="loadbtn">LOAD REPORT</button>
                    </div>
                </div>
            </main>
            `, {
            element: `<div></div>`
        });
    }
}));
