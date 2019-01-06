var Draw = (function () {
    function Draw(el, lon, lat, config) {
        if (config === void 0) { config = {}; }
        var _this = this;
        this.zoomRate = 10;
        this.config = null;
        this.canvasCalc = null;
        this.canvasMain = null;
        this.canvasBottom = null;
        this.canvasTop = null;
        this.canvasText = null;
        this.isBusy = false;
        this.drawSleep = 500;
        this.needDraw = false;
        this.needDrawCar = true;
        this.drawCarRectCount = 0;
        this.isInit = false;
        this.isDrag = false;
        this.isPinch = false;
        this.trackPauseCount = 0;
        this.trackLastGps = null;
        this.timesColor = 'rgba(255,0,0,0.05)';
        this.timesColorList = [];
        this.lastGpsRect = null;
        this.isAsynLoadBusy = false;
        this.needAsynLoad = false;
        this.log('Draw 启动 [' + el + ']');
        if (config['zoomRate'] === undefined) {
            config['zoomRate'] = 20;
        }
        this.setConfig(config);
        this.debug(config);
        this.elementId = el;
        this.centerGps = new Gps(lon, lat);
        this.elementInit(el);
        this.elementBind();
        this.timesColorInit();
        window.setInterval(function () {
            _this.resetDrawCanvas();
        }, this.drawSleep);
        window.setInterval(function () {
            if (_this.needAsynLoad && _this.config['loadAsynFn']) {
                if (_this.isAsynLoadBusy)
                    return;
                _this.isAsynLoadBusy = true;
                _this.needAsynLoad = false;
                if (_this.config['isDebug']) {
                    console.time('load');
                    console.count('load');
                }
                $('#divLoading').show();
                _this.config['loadAsynFn']();
            }
        }, 100);
        this.resetDraw(true);
        this.isInit = true;
    }
    Draw.prototype.setConfig = function (config) {
        var _config = {
            backgroundColor: '#fff',
            textColor: '#000',
            canDrag: true,
            canZoom: true,
            zoomRate: -1,
            zoomRateMax: 200,
            zoomRateMin: 1,
            clickFn: null,
            drawFn:null,
            loadSyncFn: null,
            loadAsynFn: null,
            gpsDistMin: 0.2,
            gpsDistMax: 20,
            isDebug: true,
            isGpsFilter: true,
            trackResetCount: 15,
            isTrack:false,
        };
        if (this.config != null) {
            _config = this.config;
        }
        if (config) {
            for (var k in _config) {
                if (k == 'zoomRate') {
                    if (_config['zoomRate'] == -1) {
                        _config[k] = config[k];
                        this.zoomRate = _config['zoomRate'];
                    }
                }
                else if (config[k] !== undefined) {
                    _config[k] = config[k];
                }
            }
            var div = $('#' + this.elementId);
            div.css('backgroundColor', _config['backgroundColor']);
            div;
            div.css('color', _config['textColor']);
        }
        this.config = _config;
        this.resetDraw();
    };
    Draw.prototype.elementInit = function (el) {
        var my = this;
        var div = $('#' + el);
        this.totalWidth = div.width();
        this.totalHeight = div.height();
        var size = 'width=' + this.totalWidth + ' height=' + this.totalHeight;
        var canvasList = $('<div id="divCanvasList"></div>');
        canvasList.append('<canvas ' + size + ' id="canvasBottom" class="canvas">no support CANVAS</canvas>');
        canvasList.append('<canvas ' + size + ' id="canvasCalc"   class="canvas" style="display:none;">no support CANVAS</canvas>');
        canvasList.append('<canvas ' + size + ' id="canvasMain"   class="canvas">no support CANVAS</canvas>');
        canvasList.append('<canvas ' + size + ' id="canvasTop"    class="canvas">no support CANVAS</canvas>');
        canvasList.append('<canvas ' + size + ' id="canvasText"   class="canvas">no support CANVAS</canvas>');
        div.append(canvasList);
        this.canvasCalc = new Canvas('canvasCalc');
        this.canvasMain = new Canvas('canvasMain');
        this.canvasTop = new Canvas('canvasTop');
        this.canvasBottom = new Canvas('canvasBottom');
        this.canvasText = new Canvas('canvasText', false);
        canvasList.append('<div id="divCar"></div>');
        div.append('<div id="divRule"><span>rule</span></div>');
        div.append('<div id="divInfo">loading...</div>');
        div.append('<div id="divLoading"><span></span><span></span><span></span><span></span><span></span></div>');
        div.append('<div id="divTrackPauseCount">自动追踪 <b>0</b> 秒后恢复</div>');
        div.attr('unselectable', 'on')
            .css({
                '-moz-user-select': 'none',
                '-o-user-select': 'none',
                '-khtml-user-select': 'none',
                '-webkit-user-select': 'none',
                '-ms-user-select': 'none',
                'user-select': 'none'
            }).bind('selectstart', function () { return false; });
    };
    Draw.prototype.elementBind = function () {
        var _this = this;
        var my = this;
        var div = $('#' + this.elementId);
        $(window).resize(function () {
            my.debug('窗口尺寸改变');
            my.resize(div.width(), div.height());
        });
        window.onerror = function (err, url, line) {
            my.error(url + '[' + line + '] ' + err);
        };
        var mc = new Hammer.Manager(div[0]);
        var pinch = new Hammer.Pinch();
        var pan = new Hammer.Pan();
        mc.add([pinch, pan]);
        var lastPoint = null;
        div.bind('mouseup', function (event) {
            if (!my.isInit)
                return;
            if (my.isDrag)
                return;
            var e = event.originalEvent;
            var p = new Point(e.clientX, e.clientY);
            var gps = GpsTool.point2gps(p);
            var dist = 0;
            if (lastPoint != null) {
                dist = GpsTool.getPointDist(p, lastPoint);
                my.debug(p + ' => ' + gps + ' dist:' + dist + 'm');
            }
            else {
                my.debug(p + ' => ' + gps);
            }
            lastPoint = p;
            if (my.config['clickFn'] != null) {
                my.config['clickFn'](p, gps, dist);
            }
        });
        if (this.config['canZoom']) {
            div.bind('mousewheel wheel', function (event) {
                if (!my.isInit)
                    return;
                var e = event.originalEvent;
                e.stopPropagation();
                e.preventDefault();
                var dy = (e.wheelDeltaY || -e.deltaY) / 1000;
                var p = new Point(e.clientX, e.clientY);
                if (my.config['canDrag']) {
                    my.zoom(dy > 0, p);
                }
                else {
                    my.zoom(dy > 0);
                }
            });
            div.bind('dblclick', function (event) {
                var e = event.originalEvent;
                var p = new Point(e.clientX, e.clientY);
                if (my.config['canDrag']) {
                    my.zoom(true, p);
                }
                else {
                    my.zoom(true);
                }
            });
            var zoomOld = 0;
            var zoomNew = 0;
            mc.on("pinchstart", function (ev) {
                if (!my.isInit)
                    return;
                zoomOld = my.zoomRate;
                zoomNew = my.zoomRate;
                my.isPinch = true;
                $('#divCar').hide();
            });
            mc.on("pinchend", function (ev) {
                if (!my.isPinch)
                    return;
                my.setZoom(zoomNew);
                $('#divCar').show();
                $('#divCanvasList').css({
                    width: '100%',
                    height: '100%',
                    top: '0px',
                    left: '0px',
                });
                var cssObj = {
                    width: my.totalWidth + 'px',
                    height: my.totalHeight + 'px',
                };
                $('#canvasBottom').css(cssObj);
                $('#canvasTop').css(cssObj);
                $('#canvasMain').css(cssObj);
                $('#canvasText').css(cssObj);
                window.setTimeout(function () {
                    my.isPinch = false;
                }, 500);
            });
            mc.on("pinchmove", function (ev) {
                if (!my.isPinch)
                    return;
                var z = zoomOld * ev.scale;
                if (z < my.config['zoomRateMin']) {
                    z = my.config['zoomRateMin'];
                }
                if (z > my.config['zoomRateMax']) {
                    z = my.config['zoomRateMax'];
                }
                if (zoomNew == z) {
                    return;
                }
                zoomNew = z;
                var w = Tool.round(my.totalWidth * ev.scale);
                var h = Tool.round(my.totalHeight * ev.scale);
                var top = (my.totalHeight - h) / 2;
                var left = (my.totalWidth - w) / 2;
                $('#divCanvasList').css({
                    width: w + 'px',
                    height: h + 'px',
                    top: top + 'px',
                    left: left + 'px',
                });
                var cssObj = {
                    width: w + 'px',
                    height: h + 'px',
                };
                $('#canvasBottom').css(cssObj);
                $('#canvasTop').css(cssObj);
                $('#canvasMain').css(cssObj);
                $('#canvasText').css(cssObj);
            });
        }
        if (this.config['canDrag']) {
            mc.on("panmove", function (ev) {
                if (!my.isInit)
                    return;
                if (my.isPinch)
                    return;
                if (Math.abs(ev.deltaX) + Math.abs(ev.deltaY) < 5) {
                    return;
                }
                my.isDrag = true;
                $('#divCanvasList').css('cursor', 'move');
                $('#divCanvasList').css('top', ev.deltaY + 'px');
                $('#divCanvasList').css('left', ev.deltaX + 'px');
            });
            mc.on("panend", function (ev) {
                if (my.isPinch)
                    return;
                my.isDrag = false;
                if (Math.abs(ev.deltaX) + Math.abs(ev.deltaY) < 5) {
                    return;
                }
                var p = new Point(my.totalWidth / 2 - ev.deltaX, my.totalHeight / 2 - ev.deltaY);
                var gps = GpsTool.point2gps(p);
                my.moveTo(gps);
                if (my.config['trackResetCount'] > 0) {
                    my.trackPauseCount = my.config['trackResetCount'] + 1;
                }
                $('#divCanvasList').css('cursor', 'default');
                $('#divCanvasList').css('top', '0px');
                $('#divCanvasList').css('left', '0px');
            });
        }
        window.setInterval(function () {
            if (!this.isTrack) return;
            _this.trackPauseCount--;
            if (_this.trackPauseCount < 0) {
                return;
            }
            if (_this.trackPauseCount == 0) {
                $('#divTrackPauseCount').hide();
                if (_this.trackLastGps != null) {
                    _this.trackTo(_this.trackLastGps);
                }
                return;
            }
            $('#divTrackPauseCount b').html(_this.trackPauseCount.toString());
            $('#divTrackPauseCount').show();
        }, 1000);
    };
    Draw.prototype.timesColorInit = function () {
        var cvs = this.canvasCalc;
        cvs.clear('#fff');
        var p = new Point(0, 0);
        for (var i = 0; i < 100; i++) {
            cvs.drawRectSize(p, 1, i + 1, this.timesColor);
        }
        var imgData = cvs.getImageData(new Point(0, this.totalHeight - 100), 1, 100);
        var timesColor = [];
        for (var i = 0; i < imgData.data.length; i += 4) {
            var c = imgData.data[i + 1];
            timesColor[c] = i / 4 + 1;
        }
        timesColor[255] = 0;
        var lastLayer = 100;
        for (var i = 0; i < 256; i++) {
            if (timesColor[i] !== undefined) {
                lastLayer = timesColor[i];
            }
            else {
                timesColor[i] = lastLayer;
            }
        }
        this.timesColorList = timesColor;
        cvs.clear();
    };
    Draw.prototype.resetDrawCanvas = function () {
        if (this.isDrag)
            return;
        if (!this.needDraw)
            return;
        if (this.isBusy) {
            this.debug('绘制太忙了');
            return;
        }
        $('#divLoading').show();
        if (this.config['isDebug']) {
            this.log('loading...');
            console.group("draw");
            console.time("draw");
            console.count('draw');
        }
        this.isBusy = true;
        this.needDraw = false;
        GpsTool.setConfig(this.centerGps, this.zoomRate, this.totalWidth, this.totalHeight);
        if (this.lastGpsRect == null ||
            this.lastGpsRect[0].toString() != GpsTool.gpsMin.toString() ||
            this.lastGpsRect[1].toString() != GpsTool.gpsMax.toString()) {
            if (this.config['loadSyncFn'] != null) {
                this.log('同步加载数据');
                if (this.config['isDebug']) {
                    console.time('load');
                    console.count('load');
                    this.config['loadSyncFn']();
                    console.debug('gpsList:' + GpsDrawData.carGpsList.length);
                    console.timeEnd('load');
                }
                else {
                    this.config['loadSyncFn']();
                }
            }
            if (this.config['loadAsynFn'] != null) {
                this.log('异步加载数据');
                this.needAsynLoad = true;
            }
        }
        this.lastGpsRect = [GpsTool.gpsMin, GpsTool.gpsMax];
        this.debug('清空页面');
        this.canvasBottom.unitCount = 0;
        this.canvasTop.unitCount = 0;
        this.canvasText.unitCount = 0;
        this.canvasMain.unitCount = 0;
        this.canvasCalc.unitCount = 0;
        this.canvasBottom.clear(this.config['background']);
        this.canvasTop.clear();
        this.canvasText.clear();
        this.canvasMain.clear();
        this.canvasCalc.clear();
        if (this.needDrawCar) {
            this.debug('绘制车辆');
            this.drawCar();
        }
        this.needDrawCar = true;
        this.debug('绘制图像');
        this.drawData();
        this.drawRule();
        this.drawCenter();
        this.debug(this.centerGps.lon + ',' + this.centerGps.lat);
        var unitCount = this.canvasBottom.unitCount
            + this.canvasCalc.unitCount
            + this.canvasMain.unitCount
            + this.canvasText.unitCount
            + this.canvasTop.unitCount;
        this.debug('drawUnit:' + unitCount);
        $('#divLoading').hide();
        this.isBusy = false;
        if (this.config['isDebug']) {
            console.timeEnd("draw");
            console.groupEnd();
        }

        if (this.config['drawFn'] != null) {
            this.config['drawFn'](this.centerGps);
        }
    };
    Draw.prototype.loadAsynFinish = function (isSuccess) {
        if (isSuccess === void 0) { isSuccess = true; }
        this.isAsynLoadBusy = false;
        if (this.config['isDebug']) {
            if (!isSuccess)
                this.debug('load error!');
            this.debug('gpsList:' + GpsDrawData.carGpsList.length);
            console.timeEnd('load');
        }
        if (isSuccess) {
            this.resetGpsDraw();
        }
    };
    Draw.prototype.drawCar = function (isMove, ms) {
        if (isMove === void 0) { isMove = false; }
        if (ms === void 0) { ms = 500; }
        var _loop_1 = function (car) {
            if (car.show == false) {
                $('#car_' + car.no).hide();
                return "continue";
            }
            var gps = new Gps(car.lon, car.lat, car.deg);
            var lastGps = car['lastGps'] || null;
            var boFilter = false;
            if (this_1.config['isGpsFilter'] && lastGps != null) {
                var dist = GpsTool.getGpsDist(gps, lastGps);
                if (dist < this_1.config['gpsDistMin']) {
                    this_1.debug('车辆[' + car.no + ']GPS移动距离[' + dist + '米] < [' + this_1.config['gpsDistMin'] + '米]');
                    boFilter = true;
                }
                else if (dist > this_1.config['gpsDistMax']) {
                    this_1.debug('车辆[' + car.no + ']GPS移动距离[' + dist + '米] > [' + this_1.config['gpsDistMax'] + '米]');
                    boFilter = true;
                    car['lastGps'] = gps;
                }
            }
            if (boFilter) {
                gps = lastGps;
            }
            else {
                car['lastGps'] = gps;
            }
            var p = GpsTool.gps2point(gps);
            var el = $('#car_' + car.no);
            var isNew = false;
            if (el.length == 0) {
                var html = '<div id="car_' + car.no + '" class="car ' + (car.isOnline ? 'online' : '') + '">';
                html += '<img src="' + car.img + '" />';
                if (car.info != '') {
                    html += '<span><b>' + (car.name == '' ? car.no : car.name) + '</b>';
                    if (car.info != ' ') {
                        html += '<br>' + car.info;
                    }
                    html += '</span>';
                }
                html += '</div>';
                el = $(html);
                $('#divCar').append(el);
                isNew = true;
            }
            else {
                if (car.info != '') {
                    var html = '<b>' + (car.name == '' ? car.no : car.name) + '</b>';
                    if (car.info != ' ') {
                        html += '<br>' + car.info;
                    }
                    el.find('span').html(html);
                }
            }
            var w = car.carWidth * this_1.zoomRate;
            if (w < 10)
                w = 10;
            var h = w * car.imgHeight / car.imgWidth;
            var top_1 = this_1.totalHeight - p.y - h / 2;
            var left = p.x - w / 2;
            el.show();
            var lTop = parseInt(el.css('top'));
            var lLeft = parseInt(el.css('left'));
            var l = Math.sqrt(Math.pow(lTop-top_1, 2) + Math.pow(lLeft-left, 2));
            if (isMove && !isNew && l < 500) {
                el.stop().animate({
                    top: top_1 + 'px',
                    left: left + 'px',
                }, ms, 'linear');
                el.css({
                    width: w + 'px',
                    height: h + 'px',
                });
            }
            else {
                el.stop().css({
                    top: top_1 + 'px',
                    left: left + 'px',
                    width: w + 'px',
                    height: h + 'px',
                });
            }
            el.find('img').css({ transform: 'rotate(' + gps.deg + 'deg)' });
            if (car.info != '') {
                var d = gps.deg * Math.PI / 180.0;
                var circleTop_1 = (Math.abs(Math.sin(d)) * w + Math.abs(Math.cos(d)) * h) / 2;
                var spanTop_1 = car.isPaver ? el.find('span').height() / 2 : (circleTop_1 + el.find('span').height() + 2);
                el.find('span').css({
                    top: (h / 2 - spanTop_1) + 'px',
                    left: (w / 2 - 60) + 'px',
                    width: '120px',
                });
                if (w < 10) {
                    el.find('span').hide();
                }
                else if (isNew) {
                    el.find('span').hide();
                    window.setTimeout(function () {
                        spanTop_1 = car.isPaver ? el.find('span').height() / 2 : (circleTop_1 + el.find('span').height() + 2);
                        el.find('span').css({
                            top: (h / 2 - spanTop_1) + 'px',
                        }).show();
                    }, 200);
                }
                else {
                    el.find('span').show();
                }
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = GpsDrawData.carList; _i < _a.length; _i++) {
            var car = _a[_i];
            _loop_1(car);
        }
    };
    Draw.prototype.drawData = function () {
        if (GpsDrawData.bottomShapeList.length > 0) {
            for (var _i = 0, _a = GpsDrawData.bottomShapeList; _i < _a.length; _i++) {
                var r = _a[_i];
                this.drawShape(this.canvasBottom, r[0], r[1]);
            }
        }
        if (GpsDrawData.topShapeList.length > 0) {
            for (var _b = 0, _c = GpsDrawData.topShapeList; _b < _c.length; _b++) {
                var r = _c[_b];
                this.drawShape(this.canvasTop, r[0], r[1]);
            }
        }
        if (GpsDrawData.mainShapeList.length > 0) {
            for (var _d = 0, _e = GpsDrawData.mainShapeList; _d < _e.length; _d++) {
                var r = _e[_d];
                this.drawShape(this.canvasMain, r[0], r[1]);
            }
        }
        this.drawCarRectCount = 0;
        switch (GpsDrawData.drawType) {
            case CarDrawType.line:
                this.drawCarGpsLine();
                break;
            case CarDrawType.path:
                this.drawCarGpsPath();
                break;
            case CarDrawType.data:
                this.drawCarGpsData();
                break;
            case CarDrawType.times:
                this.drawCarGpsTimes();
                break;
        }
        this.debug('carRectCount:' + this.drawCarRectCount);
    };
    Draw.prototype.getCarList = function (isOnlyPaver) {
        if (isOnlyPaver === void 0) { isOnlyPaver = false; }
        var carList = new Object();
        for (var _i = 0, _a = GpsDrawData.carList; _i < _a.length; _i++) {
            var car = _a[_i];
            if (car.show == false) {
                continue;
            }
            if (isOnlyPaver && !car.isPaver) {
                continue;
            }
            carList[car.no] = car;
            carList[car.no]['lastId'] = -1;
            carList[car.no]['gpsPoint'] = null;
            carList[car.no]['gpsPointList'] = [];
        }
        return carList;
    };
    Draw.prototype.drawCarGpsLine = function () {
        var carList = this.getCarList();
        for (var _i = 0, _a = GpsDrawData.carGpsList; _i < _a.length; _i++) {
            var carGps = _a[_i];
            var car = carList[carGps.car_no];
            if (car === undefined || !car.isDraw) {
                continue;
            }
            var gps = new Gps(carGps.lon, carGps.lat);
            var p = GpsTool.gps2point(gps);
            this.canvasMain.drawCircle(p, 2, car['color']);
            if (carGps.last_id == car['lastId']) {
                this.canvasMain.drawLine(p, car['gpsPoint'], car['color'], 1);
            }
            car['lastId'] = carGps.id;
            car['gpsPoint'] = p;
        }
    };
    Draw.prototype.drawCarGpsPath = function (isOnlyPaver) {
        if (isOnlyPaver === void 0) { isOnlyPaver = false; }
        var carList = this.getCarList(isOnlyPaver);
        for (var _i = 0, _a = GpsDrawData.carGpsList; _i < _a.length; _i++) {
            var carGps = _a[_i];
            var car = carList[carGps.car_no];
            if (car === undefined || !car.isDraw) {
                continue;
            }
            if (isOnlyPaver)
            {
                car['gpsPoint'] = this.drawGpsRect(this.canvasMain, car, carGps, GpsDrawData.paverColor, 0, 1, 'gray');
                car['lastId'] = carGps.id;
            }
            else
            {
                car['gpsPoint'] = this.drawGpsRect(this.canvasMain, car, carGps, car.color, 0, 0, 'gray');
                car['lastId'] = carGps.id;
            }
        }
    };
    Draw.prototype.drawCarGpsData = function () {
        var carList = this.getCarList();
        if (GpsDrawData.dataShowPaver) {
            this.drawCarGpsPath(true);
        }
        for (var _i = 0, _a = GpsDrawData.carGpsList; _i < _a.length; _i++) {
            var carGps = _a[_i];
            var car = carList[carGps.car_no];
            if (car === undefined || !car.isDraw) {
                continue;
            }
            if (GpsDrawData.dataShowPaver && car.isPaver) {
                continue;
            }
            var color = car.color;
            if (carGps.data && carGps.data.length > GpsDrawData.dataIndex) {
                color = this.getCarDataColor(carGps.data[GpsDrawData.dataIndex]);
            }
            car['gpsPoint'] = this.drawGpsRect(this.canvasMain, car, carGps, color, 0, 1, 'gray');
            car['lastId'] = carGps.id;
        }
    };
    Draw.prototype.getCarDataColor = function (val) {
        if (val === null) {
            return '';
        }
        if (GpsDrawData.dataColorRange.length == 0) {
            return '';
        }
        var color = '';
        var i = 0;
        for (var _i = 0, _a = GpsDrawData.dataColorRange; _i < _a.length; _i++) {
            var r = _a[_i];
            if (i == 0 && val < r.min) {
                color = r.color.toString();
                break;
            }
            if (i == GpsDrawData.dataColorRange.length - 1 && val > r.max) {
                color = r.color.toString();
                break;
            }
            if (val >= r.min && val <= r.max) {
                if (r.colorMin == null) {
                    color = r.color.toString();
                }
                else if (i == 0) {
                    var per = (r.max - val) / (r.max - r.min);
                    color = this.getColorPer(r, per);
                }
                else if (i == GpsDrawData.dataColorRange.length - 1) {
                    var per = 1 - Math.abs((r.max + r.min) / 2 - val) / ((r.max - r.min) / 2);
                    color = this.getColorPer(r, per);
                }
                else {
                    var per = (val - r.min) / (r.max - r.min);
                    color = this.getColorPer(r, per);
                }
                break;
            }
        }
        if (color == '') {
            color = GpsDrawData.dataColorRange[GpsDrawData.dataColorRange.length - 1].color.toString();
        }
        return color;
    };
    Draw.prototype.getColorPer = function (range, per) {
        if (per <= 0) {
            return range.colorMin.toString();
        }
        if (per >= 1) {
            return range.color.toString();
        }
        var r = range.colorMin.r + (range.color.r - range.colorMin.r) * per;
        var g = range.colorMin.g + (range.color.g - range.colorMin.g) * per;
        var b = range.colorMin.b + (range.color.b - range.colorMin.b) * per;
        return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
    };
    Draw.prototype.drawCarGpsTimes = function (isDraw) {
        if (isDraw === void 0) { isDraw = true; }
        var carList = this.getCarList();
        if (GpsDrawData.dataShowPaver && isDraw) {
            this.drawCarGpsPath(true);
        }
        this.canvasCalc.clear('#fff');
        for (var _i = 0, _a = GpsDrawData.carGpsList; _i < _a.length; _i++) {
            var carGps = _a[_i];
            var car = carList[carGps.car_no];
            if (car === undefined || !car.isDraw) {
                continue;
            }
            if (GpsDrawData.dataShowPaver && car.isPaver) {
                continue;
            }
            car['gpsPoint'] = this.drawGpsRect(this.canvasCalc, car, carGps, this.timesColor);
            car['lastId'] = carGps.id;
        }
        if (!isDraw)
        {
            return;
        }
        var p = new Point(0, 0);
        var imgMainData = this.canvasMain.getImageData(p, this.totalWidth, this.totalHeight);
        var imgCalcData = this.canvasCalc.getImageData(p, this.totalWidth, this.totalHeight);
        if (this.timesColorList.length == 0) {
            imgMainData = imgCalcData;
        }
        else {
            for (var x = 1; x < this.totalWidth - 1; x++) {
                for (var y = 1; y < this.totalHeight - 1; y++) {
                    var i = (y * this.totalWidth + x) * 4;
                    if (imgCalcData.data[i + 1] == 255) {
                        continue;
                    }
                    var n = this.getMiddleTimes(imgCalcData, x, y);
                    var alpha = 255;
                    var red = 0;
                    var green = 0;
                    var blue = 0;
                    if (n >= GpsDrawData.timesColorList.length) {
                        n = GpsDrawData.timesColorList.length - 1;
                    }
                    red = GpsDrawData.timesColorList[n].r;
                    green = GpsDrawData.timesColorList[n].g;
                    blue = GpsDrawData.timesColorList[n].b;
                    imgMainData.data[i] = red;
                    imgMainData.data[i + 1] = green;
                    imgMainData.data[i + 2] = blue;
                    imgMainData.data[i + 3] = alpha;
                }
            }
        }
        this.canvasMain.putImageData(imgMainData, new Point(0, 0));
        imgMainData = null;
        imgCalcData = null;
        //this.canvasCalc.clear('#fff');
    };
    Draw.prototype.getCarTimes = function (carNo) {
        var carList = this.getCarList();
        var car = carList[carNo];
        if (car === undefined || !car.isDraw) {
            return 0;
        }

        var p = new Point(0, 0);
        var imgCalcData = this.canvasCalc.getImageData(p, this.totalWidth, this.totalHeight);

        var p = GpsTool.gps2point({lon:car.lon, lat:car.lat});
        var times = this.getMiddleTimes(imgCalcData, Math.round(p.x), this.totalHeight - Math.round(p.y));
        imgCalcData = null;

        return times || 0;
    };
    Draw.prototype.getPointTimes = function (x, y) {
        var p = new Point(0, 0);
        var imgCalcData = this.canvasCalc.getImageData(p, this.totalWidth, this.totalHeight);

        var times = this.getMiddleTimes(imgCalcData, Math.round(x), this.totalHeight - Math.round(y));
        imgCalcData = null;

        return times || 0;
    };
    Draw.prototype.getMiddleTimes = function (imgCalcData, x, y) {
        var x2y2 = this.getTimes(imgCalcData, x, y - 1);
        var x8y8 = this.getTimes(imgCalcData, x, y + 1);
        if (x2y2 == x8y8) {
            return x2y2;
        }
        var x4y4 = this.getTimes(imgCalcData, x - 1, y);
        var x6y6 = this.getTimes(imgCalcData, x + 1, y);
        if (x4y4 == x6y6) {
            return x4y4;
        }
        var x1y1 = this.getTimes(imgCalcData, x - 1, y - 1);
        var x9y9 = this.getTimes(imgCalcData, x + 1, y + 1);
        if (x1y1 == x9y9) {
            return x1y1;
        }
        var x3y3 = this.getTimes(imgCalcData, x + 1, y - 1);
        var x7y7 = this.getTimes(imgCalcData, x - 1, y + 1);
        if (x3y3 == x7y7) {
            return x3y3;
        }
        var n = this.getTimes(imgCalcData, x, y);
        return n;
    };
    Draw.prototype.getTimes = function (imgCalcData, x, y) {
        var i = (y * this.totalWidth + x) * 4;
        var n = this.timesColorList[imgCalcData.data[i + 1]];
        return n;
    };
    Draw.prototype.drawGpsRect = function (canvas, car, carGps, fillColor, extWidth, lineWidth, lineColor) {
        if (extWidth === void 0) { extWidth = 0; }
        if (lineWidth === void 0) { lineWidth = 0; }
        if (lineColor === void 0) { lineColor = ''; }
        var gpsPoint2 = new CarGpsPoint(new Gps(carGps.lon, carGps.lat, carGps.deg), car['carWidth']);
        if (car['lastId'] != carGps.last_id) {
            return gpsPoint2;
        }
        var gpsPoint1 = car['gpsPoint'];
        if (GpsTool.checkPoint([gpsPoint1.p1, gpsPoint1.p2, gpsPoint2.p1, gpsPoint2.p2]) === false) {
            return gpsPoint2;
        }
        if (this.config['isGpsFilter']) {
            var dist = GpsTool.getPointDist(gpsPoint1.p, gpsPoint2.p);
            if (dist < this.config['gpsDistMin']) {
                this.debug('GPS距离[' + dist + '米] < [' + this.config['gpsDistMin'] + '米]');
                return gpsPoint1;
            }
            else if (dist > this.config['gpsDistMax']) {
                this.debug('GPS距离[' + dist + '米] > [' + this.config['gpsDistMax'] + '米]');
                return gpsPoint2;
            }
        }
        var list = [gpsPoint1.p1, gpsPoint1.p2, gpsPoint2.p2, gpsPoint2.p1];
        canvas.drawCarArea(list, fillColor, extWidth, fillColor);
        this.drawCarRectCount++;
        if (lineWidth > 0) {
            canvas.drawLine(list[1], list[2], lineColor, lineWidth);
            canvas.drawLine(list[0], list[3], lineColor, lineWidth);
            canvas.drawLine(list[0], list[1], fillColor, 2);
        }
        return gpsPoint2;
    };
    Draw.prototype.drawShape = function (canvas, shape, data) {
        switch (shape) {
            case ShapeType.line:
            {
                var gps1 = data['gps1'];
                var gps2 = data['gps2'];
                var width = data['width'] === undefined ? 1 : data['width'];
                var color = data['color'] === undefined ? 'red' : data['color'];
                canvas.gpsDrawLine(gps1, gps2, color, width);
            }
                break;
            case ShapeType.area:
            {
                var gpsList = data['gps_list'];
                var width = data['width'] === undefined ? 0 : data['width'];
                var fillColor = data['fillColor'] === undefined ? 'red' : data['fillColor'];
                var lineColor = data['lineColor'] === undefined ? 'black' : data['lineColor'];
                canvas.gpsDrawArea(gpsList, fillColor, width, lineColor);
            }
                break;
            case ShapeType.circle:
            {
                var gps = data['gps'];
                var r = data['r'] === undefined ? 1 : data['r'];
                var color = data['color'] === undefined ? 'red' : data['color'];
                canvas.gpsDrawCircle(gps, r, color);
            }
                break;
            case ShapeType.circleLine:
            {
                var gps = data['gps'];
                var r = data['r'] === undefined ? 1 : data['r'];
                var width = data['width'] === undefined ? 0.1 : data['width'];
                var color = data['color'] === undefined ? 'red' : data['color'];
                canvas.gpsDrawCircleLine(gps, r, color);
            }
                break;
            case ShapeType.lineList:
            {
                var gpsList = data['gps_list'];
                var width = data['width'] === undefined ? 0.1 : data['width'];
                var color = data['color'] === undefined ? 'red' : data['color'];
                canvas.gpsDrawLineList(gpsList, color, width);
            }
                break;
            case ShapeType.rect:
            {
                if (data['gps'] === undefined) {
                    var gps1 = data['gps1'];
                    var gps2 = data['gps2'];
                    var color = data['color'] === undefined ? 'red' : data['color'];
                    canvas.gpsDrawRect(gps1, gps2, color);
                }
                else {
                    var gps = data['gps'];
                    var h = data['h'] === undefined ? 1 : data['h'];
                    var w = data['w'] === undefined ? 1 : data['w'];
                    var color = data['color'] === undefined ? 'red' : data['color'];
                    canvas.gpsDrawRectSize(gps, w, h, color);
                }
            }
                break;
            case ShapeType.rectLine:
            {
                if (data['gps'] === undefined) {
                    var gps1 = data['gps1'];
                    var gps2 = data['gps2'];
                    var width = data['width'] === undefined ? 0.1 : data['width'];
                    var color = data['color'] === undefined ? 'red' : data['color'];
                    canvas.gpsDrawRectLine(gps1, gps2, color, width);
                }
                else {
                    var gps = data['gps'];
                    var h = data['h'] === undefined ? 1 : data['h'];
                    var w = data['w'] === undefined ? 1 : data['w'];
                    var width = data['width'] === undefined ? 0.1 : data['width'];
                    var color = data['color'] === undefined ? 'red' : data['color'];
                    canvas.gpsDrawRectSizeLine(gps, w, h, color, width);
                }
            }
                break;
            case ShapeType.text:
            {
                var gps = data['gps'];
                var str = data['str'];
                var color = data['color'] === undefined ? 'red' : data['color'];
                var font = data['font'] === undefined ? '12px serif' : data['font'];
                this.canvasText.gpsDrawTextCenter(gps, str, color, font);
            }
                break;
        }
    };
    Draw.prototype.drawCenter = function () {
        var r = 5;
        var len = 10;
        var color = '#999';
        var p = new Point(Math.round(this.totalWidth / 2) + 0.5, Math.round(this.totalHeight / 2) + 0.5);
        this.canvasTop.drawCircleLine(p, r, color);
        var p1 = new Point(p.x - len, p.y);
        var p2 = new Point(p.x + len, p.y);
        this.canvasTop.drawLine(p1, p2, color);
        p1 = new Point(p.x, p.y - len);
        p2 = new Point(p.x, p.y + len);
        this.canvasTop.drawLine(p1, p2, color);
    };
    Draw.prototype.drawRule = function () {
        var m = Tool.round(100 / this.zoomRate);
        if (m > 10) {
            m = Math.floor(m / 5) * 5;
        }
        var w = m * this.zoomRate;
        $('#divRule span').html(m + '米');
        $('#divRule').css('width', w + 'px');
        var initGps = new Gps(108, 34);
        var pStart = GpsTool.gps2point(initGps);
        pStart.x = pStart.x % w;
        pStart.y = pStart.y % w;
        for (var x = pStart.x; x < this.totalWidth; x += w) {
            var xx = Tool.round(x) + 0.5;
            var p1 = new Point(xx, 0);
            var p2 = new Point(xx, this.totalHeight);
            this.canvasBottom.drawLine(p1, p2, 'rgba(100,100,100,0.3)', 1);
        }
        for (var y = pStart.y; y < this.totalHeight; y += w) {
            var yy = Tool.round(y) + 0.5;
            var p1 = new Point(0, yy);
            var p2 = new Point(this.totalWidth, yy);
            this.canvasBottom.drawLine(p1, p2, 'rgba(100,100,100,0.3)', 1);
        }
    };
    Draw.prototype.resetDraw = function (bo) {
        if (bo === void 0) { bo = false; }
        this.needDraw = true;
        if (bo) {
            this.resetDrawCanvas();
        }
    };
    Draw.prototype.resetGpsDraw = function () {
        this.needDraw = true;
        this.needDrawCar = false;
    };
    Draw.prototype.moveTo = function (gps, isDrawCar) {
        if (isDrawCar === void 0) { isDrawCar = true; }
        if (!this.isInit)
            return;
        if (this.isDrag)
            return;
        this.centerGps = gps;
        this.log('中心位置移动：' + gps.lon + ',' + gps.lat);
        this.needDrawCar = isDrawCar;
        this.resetDraw(true);
    };
    Draw.prototype.trackTo = function (gps) {
        if (!this.isInit)
            return;
        if (this.isDrag)
            return;
        if (this.trackPauseCount <= 0) {
            this.centerGps = gps;
            this.log('中心位置移动：' + gps.lon + ',' + gps.lat);
        }
        this.trackLastGps = gps;
        this.needDrawCar = true;
        this.resetDraw(true);
    };
    Draw.prototype.resize = function (w, h) {
        this.debug('新尺寸：' + w + ',' + h);
        this.totalWidth = w;
        this.totalHeight = h;
        this.canvasCalc.sizeChange(w, h);
        this.canvasMain.sizeChange(w, h);
        this.canvasTop.sizeChange(w, h);
        this.canvasBottom.sizeChange(w, h);
        this.resetDraw();
    };
    Draw.prototype.setZoom = function (zoom) {
        if (!this.isInit)
            return;
        if (zoom > this.config['zoomRateMax']) {
            zoom = this.config['zoomRateMax'];
        }
        if (zoom < this.config['zoomRateMin']) {
            zoom = this.config['zoomRateMin'];
        }
        if (zoom == this.zoomRate) {
            return;
        }
        this.zoomRate = Tool.round(zoom, 1);
        this.debug('zoom=' + zoom);
        this.resetDraw(true);
    };
    Draw.prototype.zoom = function (bo, p) {
        if (p === void 0) { p = null; }
        if (!this.isInit)
            return;
        var val = this.zoomRate;
        if (bo) {
            val *= 1.2;
            if (val > this.config['zoomRateMax']) {
                val = this.config['zoomRateMax'];
            }
        }
        else {
            val *= 0.8;
            if (val < this.config['zoomRateMin']) {
                val = this.config['zoomRateMin'];
            }
        }
        val = Tool.round(val, 3);
        if (val == this.zoomRate) {
            return;
        }
        if (p != null) {
            var xOld = (p.x - this.totalWidth / 2) / this.zoomRate;
            var yOld = (p.y - this.totalHeight / 2) / this.zoomRate;
            var xNew = (p.x - this.totalWidth / 2) / val;
            var yNew = (p.y - this.totalHeight / 2) / val;
            var gps = GpsTool.gpsMoveSize(this.centerGps, xOld - xNew, yNew - yOld);
            this.centerGps = gps;
        }
        this.zoomRate = val;
        this.debug('zoom=' + val);

        this.needDrawCar = true;
        this.resetDraw(true);
    };
    Draw.prototype.log = function (str) {
        $('#divInfo').css('color', '').html(str);
        console.log(str);
    };
    Draw.prototype.debug = function (obj) {
        if (this.config['isDebug']) {
            console.debug(obj);
        }
    };
    Draw.prototype.error = function (str) {
        $('#divInfo').css('color', 'red').html(str);
        console.error(str);
    };
    return Draw;
}());
var ColorRgb = (function () {
    function ColorRgb(r, g, b, a) {
        if (a === void 0) { a = 1; }
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    ColorRgb.prototype.toString = function () {
        return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
    };
    return ColorRgb;
}());
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
GpsTool.center = null;
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
        if (GpsTool.checkPoint([p1, p2]) === false)
            return;
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
