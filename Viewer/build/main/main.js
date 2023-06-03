RHU.import(RHU.module({ trace: new Error(),
    name: "test", hard: ["RHU.Macro"],
    callback: function () {
        let { RHU } = window.RHU.require(window, this);
        let appmount = function () {
            this.load.onchange = function (e) {
                try {
                    let files = e.target.files;
                    if (!files.length) {
                        console.warn('No file selected!');
                        return;
                    }
                    let file = files[0];
                    let reader = new FileReader();
                    const self = this;
                    reader.onload = (event) => {
                        if (RHU.exists(event.target)) {
                            console.log(JSON.parse(event.target.result));
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
            <input rhu-id="load" type="file" accept="application/json"/>
            `, {
            element: `<div></div>`
        });
    }
}));
