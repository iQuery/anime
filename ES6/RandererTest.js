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
            this.zoomRate = 1;
            this.text = config;
        }
        Renderer.prototype = {
            init: function (config, element) {

                this.container = null;
                this.element = $(element);
                this.width = this.element.width();
                this.height = this.element.height();
                this.config = config;
                this.text = config;
                this.createCanvas();
                this.bindEvents();
                this.drawGrid();
                this.drawCar();
            },
            bindEvents: function (){
                var This = this;

                var el = new Hammer.Manager(this.element[0]);
                var pinch = new Hammer.Pinch();
                var pan = new Hammer.Pan();
                el.add([pinch, pan]);
                let dx = 0;
                let dy = 0;
                el.on("panmove", function (ev) {

                    if (Math.abs(ev.deltaX) + Math.abs(ev.deltaY) < 5) {
                        return;
                    }
                    dy = ev.deltaY % This.gridWidth;
                    dx = ev.deltaX % This.gridWidth;
                    This.floorContainer.css('cursor', 'move').css('top', dy + 'px').css('left', dx + 'px');
                    This.container.css('cursor', 'move').css('top', ev.deltaY + 'px').css('left', ev.deltaX + 'px');
                });
                el.on("panend", function (ev) {

                    if (Math.abs(ev.deltaX) + Math.abs(ev.deltaY) < 5) {
                        return;
                    }
                    var p = new Point(This.totalWidth / 2 - ev.deltaX, This.totalHeight / 2 - ev.deltaY);
                    var gps = GpsTool.point2gps(p);
                    // This.moveTo(gps);
                    // if (This.config['trackResetCount'] > 0) {
                    //     This.trackPauseCount = This.config['trackResetCount'] + 1;
                    // }
                    This.floorContainer.css('cursor', 'default').css('top', '0px').css('left', '0px');
                    This.container.css('cursor', 'default').css('top', '0px').css('left', '0px');
                    This.drawGrid(dx, dy);
                });
            }
            ,
            createCanvas: function () {
                var size = 'width=' + this.element.width() + ' height=' + this.element.height();
                var canvasList = `
                    <div id="floorContainer"><canvas ${size} id="canvasFloor" class="canvas">no support CANVAS</canvas></div>
                    <div id="divCanvasList">
                        <canvas ${size} id="canvasBottom" class="canvas">no support CANVAS</canvas>
                        <canvas ${size} id="canvasCalc" class="canvas">no support CANVAS</canvas>
                        <canvas ${size} id="canvasMain" class="canvas">no support CANVAS</canvas>
                        <canvas ${size} id="canvasTop" class="canvas">no support CANVAS</canvas>
                        <canvas ${size} id="canvasText" class="canvas">no support CANVAS</canvas>
                        <div class="carList"></div>
                    </div>
                    `;
                this.element.html(canvasList);
                this.container = $("#divCanvasList");
                this.floorContainer = $("#floorContainer");
                this.canvasFloor = new Canvas("canvasFloor");

                console.log("create canvas!");
            },
            draw: function () {
                console.log(this.text);
            },
            drawCar: function () {
                let carContainer = $("#divCanvasList .carList");
                let car = {no: "AS3333333"};
                let carHtml = `
                    <div id="car_${car.no}" class="car">
                        <img src="img/car_paver.png"/>;
                        <span>
                            <b>
                            </b>
                            <br>
                        </span>
                    </div>
                `;
                carContainer.append(carHtml);
                console.log(this.text);
            },
            drawGrid: function (dx = 0, dy = 0) {
                this.canvasFloor.clear();
                var m = Tool.round(100 / this.zoomRate);
                if (m > 10) {
                    m = Math.floor(m / 5) * 5;
                }
                var w = m * this.zoomRate;
                this.gridWidth = w;
                // $('#divRule span').html(m + '米');
                // $('#divRule').css('width', w + 'px');
                var initGps = new Gps(108, 34);
                var pStart = GpsTool.gps2point(initGps);
                this.canvasFloor.dx = ((this.canvasFloor.dx || 0) + dx) % w;
                this.canvasFloor.dy = ((this.canvasFloor.dy || 0) + dy) % w;

                pStart.x = 0;

                pStart.x = +this.canvasFloor.dx;
                pStart.y = -this.canvasFloor.dy;
                console.log(`x = ${pStart.x} , y = ${pStart.y};  dx = ${dx}, dy = ${dy}`);
                for (var x = pStart.x; x < this.width; x += w) {
                    var xx = Tool.round(x) + 0.5;
                    var p1 = new Point(xx, 0);
                    var p2 = new Point(xx, this.height );
                    this.canvasFloor.drawLine(p1, p2, 'rgba(1,1,1,0.3)', 0.5);
                }
                for (var y = pStart.y; y < this.height; y += w) {
                    var yy = Tool.round(y) + 0.5;
                    var p1 = new Point(0, yy);
                    var p2 = new Point(this.width, yy);
                    this.canvasFloor.drawLine(p1, p2, 'rgba(100,100,100,0.3)', 0.5);
                }
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


var Gps = (function () {
    function Gps(lon, lat, deg) {
        if (deg === void 0) { deg = null; }
        this.lon = lon;
        this.lat = lat;
        this.deg = deg;
    }
    Gps.prototype.toString = function () {
        return this.lon + ',' + this.lat;
    };
    return Gps;
}());
var Point = (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.prototype.toString = function () {
        return this.x + ',' + this.y;
    };
    return Point;
}());
var CarGpsPoint = (function () {
    function CarGpsPoint(gps, w) {
        this.gps = gps;
        this.w = w;
        this.p = null;
        this.p1 = null;
        this.p2 = null;
        this.p = GpsTool.gps2point(gps);
        var dist = w * GpsTool.zoom / 2;
        this.p1 = GpsTool.goAngle(this.p, gps.deg + 90, dist);
        this.p2 = GpsTool.goAngle(this.p, gps.deg - 90, dist);
    }
    return CarGpsPoint;
}());
var Tool = (function () {
    function Tool() {
    }
    Tool.round = function (num, dec) {
        if (dec === void 0) { dec = 0; }
        if (dec == 0) {
            return Math.round(num);
        }
        var rate = Math.pow(10, dec);
        num *= rate;
        num = Math.round(num) / rate;
        return num;
    };
    return Tool;
}());
var GpsTool = (function () {
    function GpsTool() {
    }
    GpsTool.setConfig = function (gps, zoom, w, h) {
        this.center = gps;
        this.zoom = zoom;
        this.w = w;
        this.h = h;
        if (this.centerCalc == null ||
            Math.abs(this.center.lat - this.centerCalc.lat) > 0.001 ||
            Math.abs(this.center.lon - this.centerCalc.lon) > 0.001) {
            this.gpsRate = Math.cos(gps.lat * Math.PI / 180);
            this.centerCalc = this.center;
        }
        this.gpsMin = this.point2gps(new Point(0, this.h));
        this.gpsMax = this.point2gps(new Point(this.w, 0));
    };
    GpsTool.px2meter = function (len) {
        return len / this.zoom;
    };
    GpsTool.meter2px = function (len) {
        var meter = len * this.zoom;
        if (meter < 0.5) {
            meter = 0.5;
        }
        return meter;
    };
    GpsTool.getPointDist = function (p1, p2) {
        var dis = 0;
        dis += Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        dis = Tool.round(dis / this.zoom, 2);
        return dis;
    };
    GpsTool.getGpsDist = function (gps1, gps2) {
        var p1 = this.gps2point(gps1);
        var p2 = this.gps2point(gps2);
        return this.getPointDist(p1, p2);
    };
    GpsTool.point2gps = function (p) {
        var x = p.x - this.w / 2;
        var y = p.y - this.h / 2;
        var xMeter = x / this.zoom;
        var yMeter = y / this.zoom;
        var lon = this.center.lon - 0 + xMeter / this.latMeter / this.gpsRate;
        var lat = this.center.lat - 0 - yMeter / this.latMeter;
        lon = Tool.round(lon, 8);
        lat = Tool.round(lat, 8);
        var gps = new Gps(lon, lat);
        return gps;
    };
    GpsTool.gps2point = function (gps) {
        var lon = gps.lon - this.center.lon;
        var lat = gps.lat - this.center.lat;
        var xMeter = lon * this.latMeter * this.gpsRate;
        var yMeter = lat * this.latMeter;
        var x = xMeter * this.zoom + this.w / 2;
        var y = yMeter * this.zoom + this.h / 2;
        return new Point(x, y);
    };
    GpsTool.gpsMoveSize = function (gps, w, h) {
        var xMeter = gps.lon * this.latMeter * this.gpsRate;
        var yMeter = gps.lat * this.latMeter;
        xMeter = xMeter + w;
        yMeter = yMeter + h;
        var lon = xMeter / this.latMeter / this.gpsRate;
        var lat = yMeter / this.latMeter;
        lon = Tool.round(lon, 8);
        lat = Tool.round(lat, 8);
        return new Gps(lon, lat);
    };
    GpsTool.goAngle = function (p, deg, dist) {
        deg = 180 - deg;
        var r = deg * Math.PI / 180.0;
        var x = p.x + Math.sin(r) * dist;
        var y = p.y - Math.cos(r) * dist;
        return new Point(x, y);
    };
    GpsTool.gpsGoAngle = function (gps, deg, m) {
        var p1 = this.gps2point(gps);
        var p2 = this.goAngle(p1, 180 - deg, m * this.zoom);
        return this.point2gps(p2);
    };
    GpsTool.checkLineCross = function (line1, line2) {
        return this.checkCross(line1, line2) && this.checkCross(line2, line1);
    };
    GpsTool.crossMul = function (p1, p2) {
        return p1.x * p2.y - p1.y * p2.x;
    };
    GpsTool.checkCross = function (line1, line2) {
        var v1 = new Point(line2[0].x - line1[1].x, line2[0].y - line1[1].y);
        var v2 = new Point(line2[1].x - line1[1].x, line2[1].y - line1[1].y);
        var v3 = new Point(line1[0].x - line1[1].x, line1[0].y - line1[1].y);
        return (this.crossMul(v1, v3) * this.crossMul(v2, v3) <= 0);
    };
    GpsTool.checkPoint = function (list) {
        var bo = true;
        var xMin = 0;
        var xMax = 0;
        var yMin = 0;
        var yMax = 0;
        for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
            var p = list_1[_i];
            if (p.x < 0)
                xMin++;
            if (p.x > this.w)
                xMax++;
            if (p.y < 0)
                yMin++;
            if (p.y > this.h)
                yMax++;
        }
        var len = list.length;
        if (xMin == len || xMax == len || yMin == len || yMax == len) {
            bo = false;
        }
        return bo;
    };
    return GpsTool;
}());
GpsTool.zoom = 10;
GpsTool.center = {lon: 104, lat: 34};
GpsTool.centerCalc = null;
GpsTool.gpsRate = 1;
GpsTool.latMeter = 111111;
GpsTool.w = 0;
GpsTool.h = 0;
GpsTool.gpsMin = null;
GpsTool.gpsMax = null;
GpsTool.getPointAngle = function (p1, p2) {
    var tan = Math.atan2(p2.x - p1.x, p2.y - p1.y) * 180 / Math.PI;
    return tan;
};
GpsTool.getGpsAngle = function (gps1, gps2) {
    var p1 = this.gps2point(gps1);
    var p2 = this.gps2point(gps2);
    var deg = this.getPointAngle(p1, p2);
    deg = Tool.round(deg, 2);
    return deg;
};

var Canvas = (function () {
    function Canvas(id, isMirror) {
        if (isMirror === void 0) { isMirror = true; }
        this.w = 0;
        this.h = 0;
        this.isMirror = true;
        this.unitCount = 0;
        var el = $('#' + id);
        this.id = id;
        this.isMirror = isMirror;
        this.ctx = el[0].getContext('2d');
        this.w = $(el).width();
        this.h = $(el).height();
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.globalAlpha = 1.0;
        if (this.isMirror) {
            this.ctx.translate(0, this.h);
            this.ctx.scale(1, -1);
        }
        this.ctx.lineJoin = "round";
    }
    Canvas.prototype.getImageData = function (p, w, h) {
        return this.ctx.getImageData(p.x, p.y, w, h);
    };
    Canvas.prototype.putImageData = function (data, p) {
        this.ctx.putImageData(data, p.x, p.y);
    };
    Canvas.prototype.drawLine = function (p1, p2, color, width) {
        if (color === void 0) { color = 'black'; }
        if (width === void 0) { width = 1; }
        // if (GpsTool.checkPoint([p1, p2]) === false)
        //     return;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawLine = function (gps1, gps2, color, width) {
        if (color === void 0) { color = 'black'; }
        if (width === void 0) { width = 1; }
        var p1 = GpsTool.gps2point(gps1);
        var p2 = GpsTool.gps2point(gps2);
        width = GpsTool.meter2px(width);
        this.drawLine(p1, p2, color, width);
    };
    Canvas.prototype.drawCircle = function (p, r, color) {
        if (color === void 0) { color = 'red'; }
        var p1 = new Point(p.x - r, p.y - r);
        var p2 = new Point(p.x + r, p.y + r);
        if (GpsTool.checkPoint([p1, p2]) === false)
            return;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawCircle = function (gps, r, color) {
        if (color === void 0) { color = 'red'; }
        var p = GpsTool.gps2point(gps);
        r = GpsTool.meter2px(r);
        this.drawCircle(p, r, color);
    };
    Canvas.prototype.drawCircleLine = function (p, r, color, width) {
        if (color === void 0) { color = 'red'; }
        if (width === void 0) { width = 1; }
        var p1 = new Point(p.x - r, p.y - r);
        var p2 = new Point(p.x + r, p.y + r);
        if (GpsTool.checkPoint([p1, p2]) === false)
            return;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.stroke();
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawCircleLine = function (gps, r, color, width) {
        if (color === void 0) { color = 'red'; }
        if (width === void 0) { width = 1; }
        var p = GpsTool.gps2point(gps);
        r = GpsTool.meter2px(r);
        width = GpsTool.meter2px(width);
        this.drawCircleLine(p, r, color, width);
    };
    Canvas.prototype.drawRect = function (p1, p2, color) {
        if (color === void 0) { color = 'red'; }
        if (GpsTool.checkPoint([p1, p2]) === false)
            return;
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawRect = function (gps1, gps2, color) {
        if (color === void 0) { color = 'red'; }
        var p1 = GpsTool.gps2point(gps1);
        var p2 = GpsTool.gps2point(gps2);
        this.drawRect(p1, p2, color);
    };
    Canvas.prototype.drawRectSize = function (p, w, h, color) {
        if (color === void 0) { color = 'red'; }
        if (GpsTool.checkPoint([p, new Point(p.x + w, p.y + h)]) === false)
            return;
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.fillRect(p.x, p.y, w, h);
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawRectSize = function (gps, w, h, color) {
        if (color === void 0) { color = 'red'; }
        var p = GpsTool.gps2point(gps);
        w = GpsTool.meter2px(w);
        h = GpsTool.meter2px(h);
        this.drawRectSize(p, w, h, color);
    };
    Canvas.prototype.drawRectLine = function (p1, p2, color, width) {
        if (color === void 0) { color = 'red'; }
        if (width === void 0) { width = 1; }
        if (GpsTool.checkPoint([p1, p2]) === false)
            return;
        this.ctx.beginPath();
        this.ctx.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.stroke();
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawRectLine = function (gps1, gps2, color, width) {
        if (color === void 0) { color = 'red'; }
        if (width === void 0) { width = 1; }
        var p1 = GpsTool.gps2point(gps1);
        var p2 = GpsTool.gps2point(gps2);
        width = GpsTool.meter2px(width);
        this.drawRectLine(p1, p2, color, width);
    };
    Canvas.prototype.drawRectSizeLine = function (p, w, h, color, width) {
        if (color === void 0) { color = 'red'; }
        if (width === void 0) { width = 1; }
        if (GpsTool.checkPoint([p, new Point(p.x + w, p.y + h)]) === false)
            return;
        this.ctx.beginPath();
        this.ctx.rect(p.x, p.y, w, h);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.stroke();
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawRectSizeLine = function (gps, w, h, color, width) {
        if (color === void 0) { color = 'red'; }
        if (width === void 0) { width = 1; }
        var p = GpsTool.gps2point(gps);
        w = GpsTool.meter2px(w);
        h = GpsTool.meter2px(h);
        width = GpsTool.meter2px(width);
        this.drawRectSizeLine(p, w, h, color, width);
    };
    Canvas.prototype.drawLineList = function (list, color = 'black', width = 1) {
        if (color === void 0) { color = 'black'; }
        if (width === void 0) { width = 1; }
        if (GpsTool.checkPoint(list) === false)
            return;
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        var isFirst = true;
        for (var _i = 0, list_2 = list; _i < list_2.length; _i++) {
            var p = list_2[_i];
            if (isFirst) {
                this.ctx.moveTo(p.x, p.y);
                isFirst = false;
            }
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.stroke();
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawLineList = function (list, color, width) {
        if (color === void 0) { color = 'black'; }
        if (width === void 0) { width = 1; }
        var pList = [];
        for (var _i = 0, list_3 = list; _i < list_3.length; _i++) {
            var gps = list_3[_i];
            pList.push(GpsTool.gps2point(gps));
        }
        width = GpsTool.meter2px(width);
        this.drawLineList(pList, color, width);
    };
    Canvas.prototype.drawArea = function (list, fillColor, width, lineColor) {
        if (fillColor === void 0) { fillColor = 'gray'; }
        if (width === void 0) { width = 0; }
        if (lineColor === void 0) { lineColor = 'black'; }
        if (GpsTool.checkPoint(list) === false)
            return;
        if (this.ctx.fillStyle != fillColor) {
            this.ctx.fillStyle = fillColor;
        }
        if (width > 0) {
            this.ctx.strokeStyle = lineColor;
            this.ctx.lineWidth = width;
        }
        this.ctx.beginPath();
        var isFirst = true;
        for (var _i = 0, list_4 = list; _i < list_4.length; _i++) {
            var p = list_4[_i];
            if (isFirst) {
                this.ctx.moveTo(p.x, p.y);
                isFirst = false;
            }
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.unitCount++;
        if (width > 0) {
            this.ctx.stroke();
            this.unitCount++;
        }
    };
    Canvas.prototype.gpsDrawArea = function (list, fillColor, width, lineColor) {
        if (fillColor === void 0) { fillColor = 'gray'; }
        if (width === void 0) { width = 0; }
        if (lineColor === void 0) { lineColor = 'black'; }
        var pList = [];
        for (var _i = 0, list_5 = list; _i < list_5.length; _i++) {
            var gps = list_5[_i];
            pList.push(GpsTool.gps2point(gps));
        }
        this.drawArea(pList, fillColor, width, lineColor);
    };
    Canvas.prototype.drawCarArea = function (list, fillColor, width, lineColor) {
        if (fillColor === void 0) { fillColor = 'gray'; }
        if (width === void 0) { width = 0; }
        if (lineColor === void 0) { lineColor = 'black'; }
        if (list.length != 4)
            return;
        if (GpsTool.checkLineCross([list[0], list[3]], [list[1], list[2]])) {
            var tmp = list[0];
            list[0] = list[1];
            list[1] = tmp;
            tmp = null;
        }
        if (this.ctx.fillStyle != fillColor) {
            this.ctx.fillStyle = fillColor;
        }
        if (width > 0) {
            this.ctx.strokeStyle = lineColor;
            this.ctx.lineWidth = width;
        }
        this.ctx.beginPath();
        var isFirst = true;
        for (var _i = 0, list_6 = list; _i < list_6.length; _i++) {
            var p = list_6[_i];
            if (isFirst) {
                this.ctx.moveTo(p.x, p.y);
                isFirst = false;
            }
            this.ctx.lineTo(p.x, p.y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.unitCount++;
        if (width > 0) {
            this.ctx.stroke();
            this.unitCount++;
        }
    };
    Canvas.prototype.clear = function (color) {
        if (color === void 0) { color = ''; }
        this.ctx.clearRect(0, 0, this.w, this.h);
        if (color != '') {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, 0, this.w, this.h);
        }
    };
    Canvas.prototype.drawText = function (p, str, color, font) {
        if (color === void 0) { color = 'black'; }
        if (font === void 0) { font = '12px Georgia'; }
        this.ctx.font = font;
        this.ctx.fillStyle = color;
        this.ctx.fillText(str, p.x, p.y);
        this.unitCount++;
    };
    Canvas.prototype.gpsDrawText = function (gps, str, color, font) {
        if (color === void 0) { color = 'black'; }
        if (font === void 0) { font = '12px Georgia'; }
        var p = GpsTool.gps2point(gps);
        p.y = this.h - p.y;
        this.drawText(p, str, color, font);
    };
    Canvas.prototype.drawTextCenter = function (p, str, color, font) {
        if (color === void 0) { color = 'black'; }
        if (font === void 0) { font = '12px Georgia'; }
        this.ctx.font = font;
        var w = this.ctx.measureText(str).width;
        p.x -= w / 2;
        this.drawText(p, str, color, font);
    };
    Canvas.prototype.gpsDrawTextCenter = function (gps, str, color, font) {
        if (color === void 0) { color = 'black'; }
        if (font === void 0) { font = '12px Georgia'; }
        var p = GpsTool.gps2point(gps);
        p.y = this.h - p.y;
        this.drawTextCenter(p, str, color, font);
    };
    Canvas.prototype.sizeChange = function (w, h) {
        this.w = w;
        this.h = h;
        var el = $('#' + this.id)[0];
        el.width = w;
        el.height = h;
        if (this.isMirror) {
            this.ctx.translate(0, this.h);
            this.ctx.scale(1, -1);
        }
    };
    return Canvas;
}());