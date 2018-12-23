class Randerer {
    zoomRate = 10;
    config = null;
    canvasCalc = null;
    canvasMain = null;
    canvasBottom = null;
    canvasTop = null;
    canvasText = null;
    isBusy = false;
    drawSleep = 500;
    needDraw = false;
    needDrawCar = true;
    drawCarRectCount = 0;
    isInit = false;
    isDrag = false;
    isPinch = false;
    trackPauseCount = 0;
    trackLastGps = null;
    timesColor = 'rgba(255,0,0,0.05)';
    gridLineColor = null;
    timesColorList = [];
    lastGpsRect = null;
    isAsynLoadBusy = false;
    needAsynLoad = false;
    elementId = null;
    centerGps = null;

    constructor(element, config) {
        if(element === undefined || element.length){
            throw new Error("Randerer");
        }
    }
    createCanvas() {

    }



}