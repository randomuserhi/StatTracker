interface appmount extends HTMLDivElement
{
    load: HTMLInputElement
}
interface appmountConstructor extends RHU.Macro.Constructor<appmount>
{
    
}

declare namespace RHU { namespace Macro {
    interface TemplateMap
    {
        "appmount": appmount
    }
}}

RHU.import(RHU.module({ trace: new Error(),
    name: "test", hard: ["RHU.Macro"],
    callback: function()
    {
        let { RHU } = window.RHU.require(window, this);

        let appmount = function(this: appmount)
        {
            this.load.onchange = function(e: any)
            {
                try 
                {
                    let files = e.target.files;
                    if (!files.length) {
                        console.warn('No file selected!');
                        return;
                    }
                    let file = files[0];
                    let reader = new FileReader();
                    const self = this;
                    reader.onload = (event) => {
                        if (RHU.exists(event.target))
                        {
                            console.log(JSON.parse(event.target.result as string));
                        }
                    };
                    reader.readAsText(file);
                } 
                catch (err) 
                {
                    console.error(err);
                }
            };
        } as appmountConstructor;
        RHU.Macro(appmount, "appmount", //html
            `
            <input rhu-id="load" type="file" accept="application/json"/>
            `, {
                element: //html
                `<div></div>`
            });
    }
}));