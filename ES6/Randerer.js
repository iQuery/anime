;(function(name, win, factory) {
    // Supports UMD. AMD, CommonJS/Node.js and browser context
    if (typeof module !== "undefined"  && module.exports) {
        module.exports = factory();
    } else if (typeof define === "function" && define.amd) {
        define(factory);
    }else if (typeof jQuery !== 'undefined') {
        $[name] = factory();
    } else {
        win[name] = factory();
    }
}("renderer", window, function() {
    var Renderer = (function() {
        function Renderer(config) {
            this.config = {};
            this.text = config;
        }
        Renderer.prototype = {
            init: function (config) {
                this.config = config;
                this.text = config;
                this.createCanvas();
            },
            createCanvas: function () {
                console.log("create canvas!");
            },
            draw: function () {
                console.log(this.text);
            }
        }
        return Renderer;
    })();
    return new Renderer();

    // return {init: function (config) {
    //
    //     return new Renderer(config);
    // }};


}));