(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var CANVAS_ID = exports.CANVAS_ID = "myCanvas";
var INPUT_ID = exports.INPUT_ID = "nCircles";

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.moveCursor = exports.releaseCircle = exports.obtainCircleAtCoordinate = undefined;

var _store = require('./store');

var _generation = require('./generation');

/* controller.js */
// The C in MVC.  Basically glue code.

function findCircleAtCoordinate(coord) {
    var reduced = (0, _store.getState)().circles.filter(function (c) {
        if (Math.abs(coord.x - c.cx) > c.r) return false;
        if (Math.abs(coord.y - c.cy) > c.r) return false;
        return true;
    });

    var circle = reduced.filter(function (c) {
        var d = (0, _generation.distance)({ x: c.cx, y: c.cy }, coord);
        return d < c.r;
    });

    return circle[0] && circle[0].id;
}

var obtainCircleAtCoordinate = exports.obtainCircleAtCoordinate = function obtainCircleAtCoordinate(x, y) {
    var circleId = findCircleAtCoordinate({ x: x, y: y });
    (0, _store.setActiveCircle)(circleId);
    (0, _store.saveCursorCoordinate)({ x: x, y: y });
};

var releaseCircle = exports.releaseCircle = function releaseCircle() {
    (0, _store.setActiveCircle)(null);
};

var moveCursor = exports.moveCursor = function moveCursor(x, y) {
    var state = (0, _store.getState)();
    if (state.activeCircle === null) return; // no circle selected.

    var dX = x - state.lastXY.x,
        dY = y - state.lastXY.y;
    (0, _store.moveCircle)(state.activeCircle, dX, dY);
    (0, _store.saveCursorCoordinate)({ x: x, y: y });
};

},{"./generation":3,"./store":6}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
// -----------------------------------------------------------------------------
// Utility

function randBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function distance(cA, cB) {
    var i,
        d = 0.0;
    for (i in cA) {
        var delta = cA[i] - cB[i];
        d += delta * delta;
    }
    return Math.sqrt(d);
}

exports.distance = distance;

// -----------------------------------------------------------------------------
// Proximity Detection

function canInsert(arr, coordinate, proximity) {
    var reduced = arr.filter(function (c) {

        var i;
        for (i in c) {
            if (Math.abs(c[i] - coordinate[i]) > proximity) return false;
        }
        return true;
    });
    //console.log(reduced);

    return !reduced.some(function (c) {
        return distance(c, coordinate) < proximity;
    });
}

// -----------------------------------------------------------------------------
// Coordinates

function generateCoordinates(_ref) {
    var count = _ref.count,
        radius = _ref.radius,
        canvasHeight = _ref.canvasHeight,
        canvasWidth = _ref.canvasWidth;

    var arr = [],
        i,
        r = radius,
        retries = 0;

    for (i = 0; i < count; i++) {
        var c = {
            x: randBetween(r, canvasWidth - r),
            y: randBetween(r, canvasHeight - r)
        };

        if (!canInsert(arr, c, 2 * r)) {
            i--;
            if (retries++ > 1000) return null; // need smaller radius.
            continue;
        }

        arr.push(c);
    }

    return arr;
}

// -----------------------------------------------------------------------------
// Colors

function generateColors(_ref2) {
    var count = _ref2.count;

    var arr = [],
        i,
        retries = 0,
        colorDiversity = 200;
    for (i = 0; i < count; i++) {
        var color = {
            r: randBetween(0, 255),
            g: randBetween(0, 255),
            b: randBetween(0, 255)
        };

        if (!canInsert(arr, color, colorDiversity)) {
            i--;
            if (retries++ > 1000) {
                colorDiversity /= 2;
                retries = 0;
            }
            continue;
        }

        arr.push(color);
        retries = 0; // reset retries.
    }
    return arr;
}

// -----------------------------------------------------------------------------
// Circles

function generateCircles(_ref3) {
    var count = _ref3.count,
        canvasHeight = _ref3.canvasHeight,
        canvasWidth = _ref3.canvasWidth;

    var arr = [],
        i;

    var r = 50,
        color;

    var coords;
    while (!(coords = generateCoordinates({ count: count, radius: r, canvasHeight: canvasHeight, canvasWidth: canvasWidth }))) {
        r -= 5;
        if (r === 0) throw "Too many circles";
    }
    var colors = generateColors({ count: count });

    for (i = 0; i < count; i++) {

        color = "rgb(" + [colors[i].r, colors[i].g, colors[i].b].join(',') + ")";

        arr.push({
            id: i,
            cx: coords[i].x,
            cy: coords[i].y,
            r: r,
            color: color
        });
    }

    return arr;
}

exports.generateCircles = generateCircles;

},{}],4:[function(require,module,exports){
'use strict';

var _constants = require('./constants');

var _render = require('./render');

var _store = require('./store');

var _controller = require('./controller');

// -----------------------------------------------------------------------------
// Helper

/* index.js */

// This will also contain much of the "view" part of an MVC architecture.

function getCanvas() {
    return document.getElementById(_constants.CANVAS_ID);
}

function getCursorPosition(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    return { x: x, y: y };
}

// -----------------------------------------------------------------------------
// Update / Render

var movingACircle = false;

function update() {
    var state = (0, _store.getState)();

    // Number of Circles input
    var inputElm = document.getElementById(_constants.INPUT_ID);
    inputElm.defaultValue = state.numberOfCircles;

    // Coordinate Display
    var coordinateElm = document.getElementById("circle-coordinates");
    var circle = state.circles[state.activeCircle];
    coordinateElm.innerHTML = circle ? "(" + circle.cx + "," + circle.cy + ")" : "";

    // CANVAS

    var foreground = document.getElementById('myCanvas').getContext('2d');
    var background = document.getElementById('myBackgroundCanvas').getContext('2d');

    function drawTheBezierCurve(context) {
        (0, _render.drawBezierCurveFromAToB)(context, {
            x: state.circles[0].cx,
            y: state.circles[0].cy
        }, {
            x: state.circles[1].cx,
            y: state.circles[1].cy
        }, state.circles[0].r);
    }

    // I will be moving a circle.  Render non-relevant
    // items in the background.
    if (!movingACircle && state.activeCircle !== null) {

        (0, _render.clear)(background);

        if (state.activeCircle < 2) {
            (0, _render.drawCircles)(background, state.circles.slice(2));
        } else {
            (0, _render.drawCircles)(background, state.circles.slice(0, state.activeCircle).concat(state.circles.slice(state.activeCircle + 1)));
            drawTheBezierCurve(background);
        }

        movingACircle = true;
    }

    if (state.activeCircle === null) {
        (0, _render.clear)(background);
        movingACircle = false;
    }

    if (movingACircle) {
        (0, _render.clear)(foreground);
        if (state.activeCircle < 2) {
            (0, _render.drawCircles)(foreground, state.circles.slice(0, 2));
            drawTheBezierCurve(foreground);
        } else {
            (0, _render.drawCircles)(foreground, [state.circles[state.activeCircle]]);
        }
    } else {

        (0, _render.clear)(foreground);
        (0, _render.drawCircles)(foreground, state.circles);

        if (state.numberOfCircles >= 2) {
            drawTheBezierCurve(foreground);
        }
    }
}

// -----------------------------------------------------------------------------
// Event Handling

function onNumberOfCirclesChange(e) {
    var nCircles = parseInt(e.target.value) || 0;
    (0, _store.setNumberOfCircles)(nCircles);
}

function handleMouseDown(event) {
    var canvas = getCanvas();
    var cursor = getCursorPosition(canvas, event);

    (0, _controller.obtainCircleAtCoordinate)(cursor.x, cursor.y);
}

function handleMouseMove(event) {
    var canvas = getCanvas();
    var cursor = getCursorPosition(canvas, event);

    (0, _controller.moveCursor)(cursor.x, cursor.y);
}

function handleMouseUp() {
    (0, _controller.releaseCircle)();
}

// -----------------------------------------------------------------------------
// Initialization

window.onload = function () {

    // adjust canvas diminensions
    var canvas = getCanvas();
    canvas.height = canvas.parentNode.offsetHeight;
    canvas.width = canvas.parentNode.offsetWidth;
    var bgCanvas = document.getElementById('myBackgroundCanvas');
    bgCanvas.height = canvas.height;
    bgCanvas.width = canvas.width;

    (0, _store.setCanvasDimensions)(canvas.height, canvas.width);

    // add event listeners
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    var inputElm = document.getElementById(_constants.INPUT_ID);
    inputElm.addEventListener('change', onNumberOfCirclesChange);

    // initialize
    inputElm.defaultValue = (0, _store.getState)().numberOfCircles;
    (0, _store.addChangeListener)(update);

    (0, _store.setNumberOfCircles)(5);
};

},{"./constants":1,"./controller":2,"./render":5,"./store":6}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function drawCircle(ctx) {
    var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        _ref$cx = _ref.cx,
        cx = _ref$cx === undefined ? 50 : _ref$cx,
        _ref$cy = _ref.cy,
        cy = _ref$cy === undefined ? 50 : _ref$cy,
        _ref$r = _ref.r,
        r = _ref$r === undefined ? 50 : _ref$r,
        _ref$color = _ref.color,
        color = _ref$color === undefined ? "#f00" : _ref$color;

    ctx.fillStyle = color;

    // add shadow to circle
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(0,0,0,0.6)";

    ctx.beginPath();

    // main circle
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.closePath();

    // reset shadow parameters
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    // border.
    var borders = [{
        offset: -3,
        width: 6,
        color: "black"
    }, {
        offset: -3,
        width: 3,
        color: "white"
    }];

    var i,
        l = borders.length;
    for (i = 0; i < l; i++) {
        ctx.strokeStyle = borders[i].color;
        ctx.lineWidth = borders[i].width;
        ctx.beginPath();
        ctx.arc(cx, cy, r + borders[i].offset, 0, Math.PI * 2, true);
        ctx.stroke();
        ctx.closePath();
    }
}

function clear(context) {
    // clear canvas
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
}

function drawCircles(context, circles) {
    // draw circles
    var i;
    for (i = 0; i < circles.length; i++) {
        drawCircle(context, circles[i]);
    }
}

function drawBezierCurveFromAToB(context, pointA, pointB, radius) {
    // leftmost point is "start", other is "end"
    var start = pointA,
        end = pointB;

    if (pointA.x > pointB.x) {
        start = pointB, end = pointA;
    }

    // if the end is not completely right of the start point.
    var above = start.x + radius > end.x - radius;

    var startX = above ? start.x - radius : start.x + radius,
        startY = start.y,
        endX = end.x - radius,
        endY = end.y;

    context.strokeStyle = "white";
    context.lineWidth = "3";
    context.beginPath();
    context.moveTo(startX, startY);
    if (above) {
        context.bezierCurveTo(startX - 20, startY, startX - 20, endY, endX, endY);
    } else {
        var half = (endX - startX) / 2;
        context.bezierCurveTo(startX + half, startY, endX - half, endY, endX, endY);
    }
    context.stroke();
    context.closePath();
}

exports.clear = clear;
exports.drawCircles = drawCircles;
exports.drawBezierCurveFromAToB = drawBezierCurveFromAToB;

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.moveCircle = exports.saveCursorCoordinate = exports.setActiveCircle = exports.setNumberOfCircles = exports.setCanvasDimensions = exports.addChangeListener = exports.getState = undefined;

var _generation = require('./generation');

// -----------------------------------------------------------------------------
// State

var state = {
    numberOfCircles: 0,
    circles: [],
    activeCircle: null,
    lastXY: { x: 0, y: 0 },
    canvasHeight: 0,
    canvasWidth: 0
};

var getState = exports.getState = function getState() {
    return state;
};

// -----------------------------------------------------------------------------
// Change Listening Mechanism

var changeListeners = [];

var addChangeListener = exports.addChangeListener = function addChangeListener(callback) {
    changeListeners.push(callback);
};

function emitChange() {
    var i,
        l = changeListeners.length;
    for (i = 0; i < l; i++) {
        changeListeners[i]();
    }
}

// -----------------------------------------------------------------------------
// Actions

function regenerateCircles() {
    state.circles = (0, _generation.generateCircles)({
        count: state.numberOfCircles,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight
    });
}

var setCanvasDimensions = exports.setCanvasDimensions = function setCanvasDimensions(height, width) {
    state.canvasHeight = height;
    state.canvasWidth = width;
    regenerateCircles();
    emitChange();
};

var setNumberOfCircles = exports.setNumberOfCircles = function setNumberOfCircles(numberOfCircles) {
    state.numberOfCircles = numberOfCircles;
    regenerateCircles();
    emitChange();
};

var setActiveCircle = exports.setActiveCircle = function setActiveCircle(circleId) {
    state.activeCircle = circleId;
    emitChange();
};

var saveCursorCoordinate = exports.saveCursorCoordinate = function saveCursorCoordinate(coordinate) {
    state.lastXY = coordinate;
};

var moveCircle = exports.moveCircle = function moveCircle(circleId, deltaX, deltaY) {
    var circle = state.circles[circleId];
    if (!circle) return;
    circle.cx += deltaX;
    circle.cy += deltaY;
    emitChange();
};

},{"./generation":3}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGNvbnN0YW50cy5qcyIsInNyY1xcY29udHJvbGxlci5qcyIsInNyY1xcZ2VuZXJhdGlvbi5qcyIsInNyY1xcaW5kZXguanMiLCJzcmNcXHJlbmRlci5qcyIsInNyY1xcc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ0NPLElBQU0sZ0NBQVksVUFBbEI7QUFDQSxJQUFNLDhCQUFXLFVBQWpCOzs7Ozs7Ozs7O0FDQ1A7O0FBT0E7O0FBVkE7QUFDQTs7QUFXQSxTQUFTLHNCQUFULENBQWdDLEtBQWhDLEVBQXNDO0FBQ2xDLFFBQU0sVUFBVSx1QkFBVyxPQUFYLENBQW1CLE1BQW5CLENBQ1osYUFBSztBQUNELFlBQUcsS0FBSyxHQUFMLENBQVMsTUFBTSxDQUFOLEdBQVUsRUFBRSxFQUFyQixJQUEyQixFQUFFLENBQWhDLEVBQW1DLE9BQU8sS0FBUDtBQUNuQyxZQUFHLEtBQUssR0FBTCxDQUFTLE1BQU0sQ0FBTixHQUFVLEVBQUUsRUFBckIsSUFBMkIsRUFBRSxDQUFoQyxFQUFtQyxPQUFPLEtBQVA7QUFDbkMsZUFBTyxJQUFQO0FBQ0gsS0FMVyxDQUFoQjs7QUFTQSxRQUFNLFNBQVMsUUFBUSxNQUFSLENBQWUsYUFBSztBQUMvQixZQUFJLElBQUksMEJBQ0osRUFBQyxHQUFFLEVBQUUsRUFBTCxFQUFTLEdBQUUsRUFBRSxFQUFiLEVBREksRUFFSixLQUZJLENBQVI7QUFJQSxlQUFPLElBQUksRUFBRSxDQUFiO0FBQ0gsS0FOYyxDQUFmOztBQVFBLFdBQU8sT0FBTyxDQUFQLEtBQWEsT0FBTyxDQUFQLEVBQVUsRUFBOUI7QUFDSDs7QUFFTSxJQUFNLDhEQUEyQixTQUFTLHdCQUFULENBQWtDLENBQWxDLEVBQW9DLENBQXBDLEVBQXNDO0FBQzFFLFFBQUksV0FBVyx1QkFBdUIsRUFBQyxJQUFELEVBQUcsSUFBSCxFQUF2QixDQUFmO0FBQ0EsZ0NB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QUFNLFlBQU4sR0FBcUIsTUFBckI7QUFDQSxVQUFNLFdBQU4sR0FBb0IsS0FBcEI7QUFDQTtBQUNBO0FBQ0gsQ0FMTTs7QUFPQSxJQUFNLGtEQUFxQixTQUFTLGtCQUFULENBQTRCLGVBQTVCLEVBQTRDO0FBQzFFLFVBQU0sZUFBTixHQUF3QixlQUF4QjtBQUNBO0FBQ0E7QUFDSCxDQUpNOztBQU1BLElBQU0sNENBQWtCLFNBQVMsZUFBVCxDQUF5QixRQUF6QixFQUFrQztBQUM3RCxVQUFNLFlBQU4sR0FBcUIsUUFBckI7QUFDQTtBQUNILENBSE07O0FBS0EsSUFBTSxzREFBdUIsU0FBUyxvQkFBVCxDQUE4QixVQUE5QixFQUF5QztBQUN6RSxVQUFNLE1BQU4sR0FBZSxVQUFmO0FBQ0gsQ0FGTTs7QUFJQSxJQUFNLGtDQUFhLFNBQVMsVUFBVCxDQUFvQixRQUFwQixFQUE2QixNQUE3QixFQUFvQyxNQUFwQyxFQUEyQztBQUNqRSxRQUFJLFNBQVMsTUFBTSxPQUFOLENBQWMsUUFBZCxDQUFiO0FBQ0EsUUFBRyxDQUFDLE1BQUosRUFBWTtBQUNaLFdBQU8sRUFBUCxJQUFhLE1BQWI7QUFDQSxXQUFPLEVBQVAsSUFBYSxNQUFiO0FBQ0E7QUFDSCxDQU5NIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG5leHBvcnQgY29uc3QgQ0FOVkFTX0lEID0gXCJteUNhbnZhc1wiO1xyXG5leHBvcnQgY29uc3QgSU5QVVRfSUQgPSBcIm5DaXJjbGVzXCI7XHJcbiIsIi8qIGNvbnRyb2xsZXIuanMgKi9cclxuLy8gVGhlIEMgaW4gTVZDLiAgQmFzaWNhbGx5IGdsdWUgY29kZS5cclxuXHJcbmltcG9ydCB7XHJcbiAgICBnZXRTdGF0ZSxcclxuICAgIHNldEFjdGl2ZUNpcmNsZSxcclxuICAgIHNhdmVDdXJzb3JDb29yZGluYXRlLFxyXG4gICAgbW92ZUNpcmNsZVxyXG59IGZyb20gJy4vc3RvcmUnO1xyXG5cclxuaW1wb3J0IHtkaXN0YW5jZX0gZnJvbSAnLi9nZW5lcmF0aW9uJztcclxuXHJcbmZ1bmN0aW9uIGZpbmRDaXJjbGVBdENvb3JkaW5hdGUoY29vcmQpe1xyXG4gICAgY29uc3QgcmVkdWNlZCA9IGdldFN0YXRlKCkuY2lyY2xlcy5maWx0ZXIoXHJcbiAgICAgICAgYyA9PiB7XHJcbiAgICAgICAgICAgIGlmKE1hdGguYWJzKGNvb3JkLnggLSBjLmN4KSA+IGMucikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZihNYXRoLmFicyhjb29yZC55IC0gYy5jeSkgPiBjLnIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxuXHJcblxyXG4gICAgY29uc3QgY2lyY2xlID0gcmVkdWNlZC5maWx0ZXIoYyA9PiB7XHJcbiAgICAgICAgdmFyIGQgPSBkaXN0YW5jZShcclxuICAgICAgICAgICAge3g6Yy5jeCwgeTpjLmN5fSxcclxuICAgICAgICAgICAgY29vcmRcclxuICAgICAgICApO1xyXG4gICAgICAgIHJldHVybiBkIDwgYy5yO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNpcmNsZVswXSAmJiBjaXJjbGVbMF0uaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUgPSBmdW5jdGlvbiBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUoeCx5KXtcclxuICAgIGxldCBjaXJjbGVJZCA9IGZpbmRDaXJjbGVBdENvb3JkaW5hdGUoe3gseX0pO1xyXG4gICAgc2V0QWN0aXZlQ2lyY2xlKGNpcmNsZUlkKTtcclxuICAgIHNhdmVDdXJzb3JDb29yZGluYXRlKHt4LHl9KTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCByZWxlYXNlQ2lyY2xlID0gZnVuY3Rpb24gcmVsZWFzZUNpcmNsZSgpe1xyXG4gICAgc2V0QWN0aXZlQ2lyY2xlKG51bGwpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1vdmVDdXJzb3IgPSBmdW5jdGlvbiBtb3ZlQ3Vyc29yKHgseSl7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XHJcbiAgICBpZihzdGF0ZS5hY3RpdmVDaXJjbGUgPT09IG51bGwpIHJldHVybjsgLy8gbm8gY2lyY2xlIHNlbGVjdGVkLlxyXG5cclxuICAgIGNvbnN0IGRYID0geCAtIHN0YXRlLmxhc3RYWS54LFxyXG4gICAgICAgICAgZFkgPSB5IC0gc3RhdGUubGFzdFhZLnk7XHJcbiAgICBtb3ZlQ2lyY2xlKHN0YXRlLmFjdGl2ZUNpcmNsZSxkWCxkWSk7XHJcbiAgICBzYXZlQ3Vyc29yQ29vcmRpbmF0ZSh7eCx5fSk7XHJcbn07XHJcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFV0aWxpdHlcclxuXHJcbmZ1bmN0aW9uIHJhbmRCZXR3ZWVuKG1pbixtYXgpe1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoobWF4LW1pbisxKSkrbWluO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXN0YW5jZShjQSxjQil7XHJcbiAgICB2YXIgaSwgZD0gMC4wO1xyXG4gICAgZm9yKGkgaW4gY0Epe1xyXG4gICAgICAgIHZhciBkZWx0YSA9IGNBW2ldLWNCW2ldO1xyXG4gICAgICAgIGQgKz0gZGVsdGEqZGVsdGE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGQpO1xyXG59XHJcblxyXG5leHBvcnQge2Rpc3RhbmNlfTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFByb3hpbWl0eSBEZXRlY3Rpb25cclxuXHJcbmZ1bmN0aW9uIGNhbkluc2VydChhcnIsY29vcmRpbmF0ZSxwcm94aW1pdHkpe1xyXG4gICAgdmFyIHJlZHVjZWQgPSBhcnIuZmlsdGVyKCBjID0+IHtcclxuXHJcbiAgICAgICAgdmFyIGk7XHJcbiAgICAgICAgZm9yKGkgaW4gYyl7XHJcbiAgICAgICAgICAgIGlmKE1hdGguYWJzKCBjW2ldIC0gY29vcmRpbmF0ZVtpXSApID4gcHJveGltaXR5KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKHJlZHVjZWQpO1xyXG5cclxuICAgIHJldHVybiAhcmVkdWNlZC5zb21lKCBjID0+IChkaXN0YW5jZShjLGNvb3JkaW5hdGUpIDwgcHJveGltaXR5KSk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENvb3JkaW5hdGVzXHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNvb3JkaW5hdGVzKHtjb3VudCxyYWRpdXMsY2FudmFzSGVpZ2h0LGNhbnZhc1dpZHRofSl7XHJcbiAgICB2YXIgYXJyID0gW10sIGksIHIgPSByYWRpdXMsIHJldHJpZXMgPSAwO1xyXG5cclxuICAgIGZvcihpPTA7aTxjb3VudDtpKyspe1xyXG4gICAgICAgIHZhciBjID0ge1xyXG4gICAgICAgICAgICB4OnJhbmRCZXR3ZWVuKHIsY2FudmFzV2lkdGgtciksXHJcbiAgICAgICAgICAgIHk6cmFuZEJldHdlZW4ocixjYW52YXNIZWlnaHQtcilcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZighY2FuSW5zZXJ0KGFycixjLDIqcikpe1xyXG4gICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgIGlmKHJldHJpZXMrKyA+IDEwMDApIHJldHVybiBudWxsOyAvLyBuZWVkIHNtYWxsZXIgcmFkaXVzLlxyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFyci5wdXNoKGMpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnI7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENvbG9yc1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDb2xvcnMoe2NvdW50fSl7XHJcbiAgICB2YXIgYXJyID0gW10saSxyZXRyaWVzID0gMCxjb2xvckRpdmVyc2l0eSA9IDIwMDtcclxuICAgIGZvcihpPTA7aTxjb3VudDtpKyspe1xyXG4gICAgICAgIHZhciBjb2xvciA9IHtcclxuICAgICAgICAgICAgcjpyYW5kQmV0d2VlbigwLDI1NSksXHJcbiAgICAgICAgICAgIGc6cmFuZEJldHdlZW4oMCwyNTUpLFxyXG4gICAgICAgICAgICBiOnJhbmRCZXR3ZWVuKDAsMjU1KVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmKCFjYW5JbnNlcnQoYXJyLGNvbG9yLGNvbG9yRGl2ZXJzaXR5KSl7XHJcbiAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgaWYocmV0cmllcysrID4gMTAwMCl7XHJcbiAgICAgICAgICAgICAgICBjb2xvckRpdmVyc2l0eSAvPSAyO1xyXG4gICAgICAgICAgICAgICAgcmV0cmllcyA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcnIucHVzaChjb2xvcik7XHJcbiAgICAgICAgcmV0cmllcyA9IDA7IC8vIHJlc2V0IHJldHJpZXMuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXJyO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDaXJjbGVzXHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNpcmNsZXMoe2NvdW50LGNhbnZhc0hlaWdodCxjYW52YXNXaWR0aH0pe1xyXG4gICAgdmFyIGFyciA9IFtdLCBpO1xyXG5cclxuICAgIHZhciByID0gNTAsIGNvbG9yO1xyXG5cclxuICAgIHZhciBjb29yZHM7XHJcbiAgICB3aGlsZSggIShjb29yZHMgPSBnZW5lcmF0ZUNvb3JkaW5hdGVzKHtjb3VudDpjb3VudCxyYWRpdXM6cixjYW52YXNIZWlnaHQsY2FudmFzV2lkdGh9KSkgKXtcclxuICAgICAgICByLT01O1xyXG4gICAgICAgIGlmKHIgPT09IDApIHRocm93IFwiVG9vIG1hbnkgY2lyY2xlc1wiO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IGdlbmVyYXRlQ29sb3JzKHtjb3VudDpjb3VudH0pO1xyXG5cclxuICAgIGZvciggaSA9IDA7IGkgPCBjb3VudDsgaSsrICl7XHJcblxyXG4gICAgICAgIGNvbG9yID0gXCJyZ2IoXCIrIFtjb2xvcnNbaV0uciwgY29sb3JzW2ldLmcsIGNvbG9yc1tpXS5iXS5qb2luKCcsJykrIFwiKVwiO1xyXG5cclxuICAgICAgICBhcnIucHVzaCh7XHJcbiAgICAgICAgICAgIGlkOmksXHJcbiAgICAgICAgICAgIGN4OmNvb3Jkc1tpXS54LFxyXG4gICAgICAgICAgICBjeTpjb29yZHNbaV0ueSxcclxuICAgICAgICAgICAgcixcclxuICAgICAgICAgICAgY29sb3JcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgcmV0dXJuIGFycjtcclxufVxyXG5cclxuZXhwb3J0IHtnZW5lcmF0ZUNpcmNsZXN9O1xyXG4iLCIvKiBpbmRleC5qcyAqL1xyXG5cclxuLy8gVGhpcyB3aWxsIGFsc28gY29udGFpbiBtdWNoIG9mIHRoZSBcInZpZXdcIiBwYXJ0IG9mIGFuIE1WQyBhcmNoaXRlY3R1cmUuXHJcblxyXG5pbXBvcnQge0NBTlZBU19JRCxJTlBVVF9JRH0gZnJvbSAnLi9jb25zdGFudHMnO1xyXG5pbXBvcnQge1xyXG4gICAgY2xlYXIsXHJcbiAgICBkcmF3Q2lyY2xlcyxcclxuICAgIGRyYXdCZXppZXJDdXJ2ZUZyb21BVG9CXHJcbn0gZnJvbSAnLi9yZW5kZXInO1xyXG5cclxuaW1wb3J0IHtcclxuICAgIGdldFN0YXRlLFxyXG4gICAgc2V0Q2FudmFzRGltZW5zaW9ucyxcclxuICAgIHNldE51bWJlck9mQ2lyY2xlcyxcclxuICAgIGFkZENoYW5nZUxpc3RlbmVyXHJcbn0gZnJvbSAnLi9zdG9yZSc7XHJcblxyXG5pbXBvcnQge1xyXG4gICAgb2J0YWluQ2lyY2xlQXRDb29yZGluYXRlLFxyXG4gICAgcmVsZWFzZUNpcmNsZSxcclxuICAgIG1vdmVDdXJzb3JcclxufSBmcm9tICcuL2NvbnRyb2xsZXInO1xyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gSGVscGVyXHJcblxyXG5mdW5jdGlvbiBnZXRDYW52YXMoKXtcclxuICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChDQU5WQVNfSUQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDdXJzb3JQb3NpdGlvbihjYW52YXMsIGV2ZW50KSB7XHJcbiAgICB2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIHZhciB4ID0gZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdDtcclxuICAgIHZhciB5ID0gZXZlbnQuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgcmV0dXJuIHt4LHl9O1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBVcGRhdGUgLyBSZW5kZXJcclxuXHJcbnZhciBtb3ZpbmdBQ2lyY2xlID0gZmFsc2U7XHJcblxyXG5mdW5jdGlvbiB1cGRhdGUoKXtcclxuICAgIGNvbnN0IHN0YXRlID0gZ2V0U3RhdGUoKTtcclxuXHJcbiAgICAvLyBOdW1iZXIgb2YgQ2lyY2xlcyBpbnB1dFxyXG4gICAgdmFyIGlucHV0RWxtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoSU5QVVRfSUQpO1xyXG4gICAgaW5wdXRFbG0uZGVmYXVsdFZhbHVlID0gc3RhdGUubnVtYmVyT2ZDaXJjbGVzO1xyXG5cclxuICAgIC8vIENvb3JkaW5hdGUgRGlzcGxheVxyXG4gICAgdmFyIGNvb3JkaW5hdGVFbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNpcmNsZS1jb29yZGluYXRlc1wiKTtcclxuICAgIHZhciBjaXJjbGUgPSBzdGF0ZS5jaXJjbGVzW3N0YXRlLmFjdGl2ZUNpcmNsZV07XHJcbiAgICBjb29yZGluYXRlRWxtLmlubmVySFRNTCA9IGNpcmNsZSA/IChcIihcIiArIGNpcmNsZS5jeCArIFwiLFwiICsgY2lyY2xlLmN5ICsgXCIpXCIpIDogXCJcIjtcclxuXHJcbiAgICAvLyBDQU5WQVNcclxuXHJcbiAgICB2YXIgZm9yZWdyb3VuZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdteUNhbnZhcycpLmdldENvbnRleHQoJzJkJyk7XHJcbiAgICB2YXIgYmFja2dyb3VuZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdteUJhY2tncm91bmRDYW52YXMnKS5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgIGZ1bmN0aW9uIGRyYXdUaGVCZXppZXJDdXJ2ZShjb250ZXh0KXtcclxuICAgICAgICBkcmF3QmV6aWVyQ3VydmVGcm9tQVRvQihcclxuICAgICAgICAgICAgY29udGV4dCxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgeDpzdGF0ZS5jaXJjbGVzWzBdLmN4LFxyXG4gICAgICAgICAgICAgICAgeTpzdGF0ZS5jaXJjbGVzWzBdLmN5XHJcbiAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgeDpzdGF0ZS5jaXJjbGVzWzFdLmN4LFxyXG4gICAgICAgICAgICAgICAgeTpzdGF0ZS5jaXJjbGVzWzFdLmN5XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXRlLmNpcmNsZXNbMF0uclxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSSB3aWxsIGJlIG1vdmluZyBhIGNpcmNsZS4gIFJlbmRlciBub24tcmVsZXZhbnRcclxuICAgIC8vIGl0ZW1zIGluIHRoZSBiYWNrZ3JvdW5kLlxyXG4gICAgaWYoIW1vdmluZ0FDaXJjbGUgJiYgc3RhdGUuYWN0aXZlQ2lyY2xlICE9PSBudWxsKXtcclxuXHJcbiAgICAgICAgY2xlYXIoYmFja2dyb3VuZCk7XHJcblxyXG4gICAgICAgIGlmKHN0YXRlLmFjdGl2ZUNpcmNsZSA8IDIpe1xyXG4gICAgICAgICAgICBkcmF3Q2lyY2xlcyhiYWNrZ3JvdW5kLHN0YXRlLmNpcmNsZXMuc2xpY2UoMikpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBkcmF3Q2lyY2xlcyhiYWNrZ3JvdW5kLHN0YXRlLmNpcmNsZXMuc2xpY2UoMCxzdGF0ZS5hY3RpdmVDaXJjbGUpLmNvbmNhdChzdGF0ZS5jaXJjbGVzLnNsaWNlKHN0YXRlLmFjdGl2ZUNpcmNsZSsxKSkpO1xyXG4gICAgICAgICAgICBkcmF3VGhlQmV6aWVyQ3VydmUoYmFja2dyb3VuZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZpbmdBQ2lyY2xlID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZihzdGF0ZS5hY3RpdmVDaXJjbGUgPT09IG51bGwpe1xyXG4gICAgICAgIGNsZWFyKGJhY2tncm91bmQpO1xyXG4gICAgICAgIG1vdmluZ0FDaXJjbGUgPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBpZihtb3ZpbmdBQ2lyY2xlKXtcclxuICAgICAgICBjbGVhcihmb3JlZ3JvdW5kKTtcclxuICAgICAgICBpZihzdGF0ZS5hY3RpdmVDaXJjbGUgPCAyKXtcclxuICAgICAgICAgICAgZHJhd0NpcmNsZXMoZm9yZWdyb3VuZCxzdGF0ZS5jaXJjbGVzLnNsaWNlKDAsMikpO1xyXG4gICAgICAgICAgICBkcmF3VGhlQmV6aWVyQ3VydmUoZm9yZWdyb3VuZCk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGRyYXdDaXJjbGVzKGZvcmVncm91bmQsW3N0YXRlLmNpcmNsZXNbc3RhdGUuYWN0aXZlQ2lyY2xlXV0pO1xyXG4gICAgICAgIH1cclxuICAgIH1lbHNle1xyXG5cclxuICAgICAgICBjbGVhcihmb3JlZ3JvdW5kKTtcclxuICAgICAgICBkcmF3Q2lyY2xlcyhmb3JlZ3JvdW5kLCBzdGF0ZS5jaXJjbGVzICk7XHJcblxyXG4gICAgICAgIGlmKHN0YXRlLm51bWJlck9mQ2lyY2xlcyA+PSAyKXtcclxuICAgICAgICAgICAgZHJhd1RoZUJlemllckN1cnZlKGZvcmVncm91bmQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIEV2ZW50IEhhbmRsaW5nXHJcblxyXG5mdW5jdGlvbiBvbk51bWJlck9mQ2lyY2xlc0NoYW5nZShlKXtcclxuICAgIHZhciBuQ2lyY2xlcyA9IHBhcnNlSW50KGUudGFyZ2V0LnZhbHVlKSB8fCAwO1xyXG4gICAgc2V0TnVtYmVyT2ZDaXJjbGVzKG5DaXJjbGVzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTW91c2VEb3duKGV2ZW50KXtcclxuICAgIGNvbnN0IGNhbnZhcyA9IGdldENhbnZhcygpO1xyXG4gICAgY29uc3QgY3Vyc29yID0gZ2V0Q3Vyc29yUG9zaXRpb24oY2FudmFzLGV2ZW50KTtcclxuXHJcbiAgICBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUoY3Vyc29yLngsY3Vyc29yLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVNb3VzZU1vdmUoZXZlbnQpe1xyXG4gICAgY29uc3QgY2FudmFzID0gZ2V0Q2FudmFzKCk7XHJcbiAgICBjb25zdCBjdXJzb3IgPSBnZXRDdXJzb3JQb3NpdGlvbihjYW52YXMsZXZlbnQpO1xyXG5cclxuICAgIG1vdmVDdXJzb3IoY3Vyc29yLngsY3Vyc29yLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVNb3VzZVVwKCl7XHJcbiAgICByZWxlYXNlQ2lyY2xlKCk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIEluaXRpYWxpemF0aW9uXHJcblxyXG53aW5kb3cub25sb2FkID0gKCk9PntcclxuXHJcbiAgICAvLyBhZGp1c3QgY2FudmFzIGRpbWluZW5zaW9uc1xyXG4gICAgdmFyIGNhbnZhcyA9IGdldENhbnZhcygpO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5wYXJlbnROb2RlLm9mZnNldEhlaWdodDtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5wYXJlbnROb2RlLm9mZnNldFdpZHRoO1xyXG4gICAgdmFyIGJnQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215QmFja2dyb3VuZENhbnZhcycpO1xyXG4gICAgYmdDYW52YXMuaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcclxuICAgIGJnQ2FudmFzLndpZHRoID0gY2FudmFzLndpZHRoO1xyXG5cclxuICAgIHNldENhbnZhc0RpbWVuc2lvbnMoY2FudmFzLmhlaWdodCxjYW52YXMud2lkdGgpO1xyXG5cclxuICAgIC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsaGFuZGxlTW91c2VEb3duKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsaGFuZGxlTW91c2VNb3ZlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLGhhbmRsZU1vdXNlVXApO1xyXG5cclxuICAgIHZhciBpbnB1dEVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElOUFVUX0lEKTtcclxuICAgIGlucHV0RWxtLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsb25OdW1iZXJPZkNpcmNsZXNDaGFuZ2UpO1xyXG5cclxuICAgIC8vIGluaXRpYWxpemVcclxuICAgIGlucHV0RWxtLmRlZmF1bHRWYWx1ZSA9IGdldFN0YXRlKCkubnVtYmVyT2ZDaXJjbGVzO1xyXG4gICAgYWRkQ2hhbmdlTGlzdGVuZXIodXBkYXRlKTtcclxuXHJcbiAgICBzZXROdW1iZXJPZkNpcmNsZXMoNSk7XHJcbn07XHJcbiIsImZ1bmN0aW9uIGRyYXdDaXJjbGUoY3R4LHtjeD01MCxjeT01MCxyPTUwLGNvbG9yPVwiI2YwMFwifT17fSl7XHJcbiAgICBjdHguZmlsbFN0eWxlPWNvbG9yO1xyXG5cclxuICAgIC8vIGFkZCBzaGFkb3cgdG8gY2lyY2xlXHJcbiAgICBjdHguc2hhZG93T2Zmc2V0WSA9IDQ7XHJcbiAgICBjdHguc2hhZG93Qmx1ciA9IDQ7XHJcbiAgICBjdHguc2hhZG93Q29sb3IgPSBcInJnYmEoMCwwLDAsMC42KVwiO1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAvLyBtYWluIGNpcmNsZVxyXG4gICAgY3R4LmFyYyhcclxuICAgICAgICBjeCxcclxuICAgICAgICBjeSxcclxuICAgICAgICByLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgTWF0aC5QSSAqIDIsXHJcbiAgICAgICAgdHJ1ZVxyXG4gICAgKTtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgLy8gcmVzZXQgc2hhZG93IHBhcmFtZXRlcnNcclxuICAgIGN0eC5zaGFkb3dPZmZzZXRZID0gMDtcclxuICAgIGN0eC5zaGFkb3dCbHVyID0gMDtcclxuICAgIGN0eC5zaGFkb3dDb2xvciA9IFwidHJhbnNwYXJlbnRcIjtcclxuXHJcbiAgICAvLyBib3JkZXIuXHJcbiAgICBjb25zdCBib3JkZXJzID0gW3tcclxuICAgICAgICBvZmZzZXQ6LTMsXHJcbiAgICAgICAgd2lkdGg6NixcclxuICAgICAgICBjb2xvcjpcImJsYWNrXCJcclxuICAgIH0se1xyXG4gICAgICAgIG9mZnNldDotMyxcclxuICAgICAgICB3aWR0aDozLFxyXG4gICAgICAgIGNvbG9yOlwid2hpdGVcIlxyXG4gICAgfV07XHJcblxyXG4gICAgdmFyIGksbCA9IGJvcmRlcnMubGVuZ3RoO1xyXG4gICAgZm9yKGk9MDtpPGw7aSsrKXtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBib3JkZXJzW2ldLmNvbG9yO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSBib3JkZXJzW2ldLndpZHRoO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguYXJjKFxyXG4gICAgICAgICAgICBjeCxcclxuICAgICAgICAgICAgY3ksXHJcbiAgICAgICAgICAgIHIgKyBib3JkZXJzW2ldLm9mZnNldCxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgTWF0aC5QSSoyLFxyXG4gICAgICAgICAgICB0cnVlXHJcbiAgICAgICAgKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFyKGNvbnRleHQpe1xyXG4gICAgLy8gY2xlYXIgY2FudmFzXHJcbiAgICBjb250ZXh0LmNsZWFyUmVjdCgwLDAsY29udGV4dC5jYW52YXMud2lkdGgsY29udGV4dC5jYW52YXMuaGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0NpcmNsZXMoY29udGV4dCxjaXJjbGVzKXtcclxuICAgIC8vIGRyYXcgY2lyY2xlc1xyXG4gICAgdmFyIGk7XHJcbiAgICBmb3IoaT0wO2k8Y2lyY2xlcy5sZW5ndGg7aSsrKXtcclxuICAgICAgICBkcmF3Q2lyY2xlKGNvbnRleHQsY2lyY2xlc1tpXSk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBkcmF3QmV6aWVyQ3VydmVGcm9tQVRvQihjb250ZXh0LCBwb2ludEEscG9pbnRCLHJhZGl1cyl7XHJcbiAgICAvLyBsZWZ0bW9zdCBwb2ludCBpcyBcInN0YXJ0XCIsIG90aGVyIGlzIFwiZW5kXCJcclxuICAgIGxldCBzdGFydCA9IHBvaW50QSxcclxuICAgICAgICBlbmQgPSBwb2ludEI7XHJcblxyXG4gICAgaWYocG9pbnRBLnggPiBwb2ludEIueCl7XHJcbiAgICAgICAgc3RhcnQgPSBwb2ludEIsIGVuZCA9IHBvaW50QTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB0aGUgZW5kIGlzIG5vdCBjb21wbGV0ZWx5IHJpZ2h0IG9mIHRoZSBzdGFydCBwb2ludC5cclxuICAgIHZhciBhYm92ZSA9IChzdGFydC54ICsgcmFkaXVzID4gZW5kLnggLSByYWRpdXMpO1xyXG5cclxuICAgIGxldCBzdGFydFggPSAoYWJvdmUpID8gKHN0YXJ0LnggLSByYWRpdXMpIDogKHN0YXJ0LnggKyByYWRpdXMpLFxyXG4gICAgICAgIHN0YXJ0WSA9IHN0YXJ0LnksXHJcbiAgICAgICAgZW5kWCA9IGVuZC54IC0gcmFkaXVzLFxyXG4gICAgICAgIGVuZFkgPSBlbmQueTtcclxuXHJcbiAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgY29udGV4dC5saW5lV2lkdGggPSBcIjNcIjtcclxuICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICBjb250ZXh0Lm1vdmVUbyhzdGFydFgsc3RhcnRZKTtcclxuICAgIGlmKGFib3ZlKXtcclxuICAgICAgICBjb250ZXh0LmJlemllckN1cnZlVG8oXHJcbiAgICAgICAgICAgIHN0YXJ0WC0yMCxcclxuICAgICAgICAgICAgc3RhcnRZLFxyXG4gICAgICAgICAgICBzdGFydFgtMjAsXHJcbiAgICAgICAgICAgIGVuZFksXHJcbiAgICAgICAgICAgIGVuZFgsXHJcbiAgICAgICAgICAgIGVuZFlcclxuICAgICAgICApO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdmFyIGhhbGYgPSAoZW5kWCAtIHN0YXJ0WCkgLyAyO1xyXG4gICAgICAgIGNvbnRleHQuYmV6aWVyQ3VydmVUbyhcclxuICAgICAgICAgICAgc3RhcnRYK2hhbGYsXHJcbiAgICAgICAgICAgIHN0YXJ0WSxcclxuICAgICAgICAgICAgZW5kWC1oYWxmLFxyXG4gICAgICAgICAgICBlbmRZLFxyXG4gICAgICAgICAgICBlbmRYLFxyXG4gICAgICAgICAgICBlbmRZXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuICAgIGNvbnRleHQuc3Ryb2tlKCk7XHJcbiAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xyXG59XHJcblxyXG5leHBvcnQge1xyXG4gICAgY2xlYXIsXHJcbiAgICBkcmF3Q2lyY2xlcyxcclxuICAgIGRyYXdCZXppZXJDdXJ2ZUZyb21BVG9CXHJcbn07XHJcbiIsImltcG9ydCB7Z2VuZXJhdGVDaXJjbGVzfSBmcm9tICcuL2dlbmVyYXRpb24nO1xyXG5cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFN0YXRlXHJcblxyXG5sZXQgc3RhdGUgPSB7XHJcbiAgICBudW1iZXJPZkNpcmNsZXM6MCxcclxuICAgIGNpcmNsZXM6W10sXHJcbiAgICBhY3RpdmVDaXJjbGU6bnVsbCxcclxuICAgIGxhc3RYWTp7eDowLHk6MH0sXHJcbiAgICBjYW52YXNIZWlnaHQ6MCxcclxuICAgIGNhbnZhc1dpZHRoOjBcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRTdGF0ZSA9IGZ1bmN0aW9uIGdldFN0YXRlKCl7XHJcbiAgICByZXR1cm4gc3RhdGU7XHJcbn07XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDaGFuZ2UgTGlzdGVuaW5nIE1lY2hhbmlzbVxyXG5cclxubGV0IGNoYW5nZUxpc3RlbmVycyA9IFtdO1xyXG5cclxuZXhwb3J0IGNvbnN0IGFkZENoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24gYWRkQ2hhbmdlTGlzdGVuZXIoY2FsbGJhY2spe1xyXG4gICAgY2hhbmdlTGlzdGVuZXJzLnB1c2goY2FsbGJhY2spO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZW1pdENoYW5nZSgpe1xyXG4gICAgdmFyIGksIGwgPSBjaGFuZ2VMaXN0ZW5lcnMubGVuZ3RoO1xyXG4gICAgZm9yKGk9MDtpPGw7aSsrKXtcclxuICAgICAgICBjaGFuZ2VMaXN0ZW5lcnNbaV0oKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gQWN0aW9uc1xyXG5cclxuZnVuY3Rpb24gcmVnZW5lcmF0ZUNpcmNsZXMoKXtcclxuICAgIHN0YXRlLmNpcmNsZXMgPSBnZW5lcmF0ZUNpcmNsZXMoe1xyXG4gICAgICAgIGNvdW50OiBzdGF0ZS5udW1iZXJPZkNpcmNsZXMsXHJcbiAgICAgICAgY2FudmFzV2lkdGg6IHN0YXRlLmNhbnZhc1dpZHRoLFxyXG4gICAgICAgIGNhbnZhc0hlaWdodDogc3RhdGUuY2FudmFzSGVpZ2h0XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHNldENhbnZhc0RpbWVuc2lvbnMgPSBmdW5jdGlvbiBzZXRDYW52YXNEaW1lbnNpb25zKGhlaWdodCx3aWR0aCl7XHJcbiAgICBzdGF0ZS5jYW52YXNIZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICBzdGF0ZS5jYW52YXNXaWR0aCA9IHdpZHRoO1xyXG4gICAgcmVnZW5lcmF0ZUNpcmNsZXMoKTtcclxuICAgIGVtaXRDaGFuZ2UoKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBzZXROdW1iZXJPZkNpcmNsZXMgPSBmdW5jdGlvbiBzZXROdW1iZXJPZkNpcmNsZXMobnVtYmVyT2ZDaXJjbGVzKXtcclxuICAgIHN0YXRlLm51bWJlck9mQ2lyY2xlcyA9IG51bWJlck9mQ2lyY2xlcztcclxuICAgIHJlZ2VuZXJhdGVDaXJjbGVzKCk7XHJcbiAgICBlbWl0Q2hhbmdlKCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgc2V0QWN0aXZlQ2lyY2xlID0gZnVuY3Rpb24gc2V0QWN0aXZlQ2lyY2xlKGNpcmNsZUlkKXtcclxuICAgIHN0YXRlLmFjdGl2ZUNpcmNsZSA9IGNpcmNsZUlkO1xyXG4gICAgZW1pdENoYW5nZSgpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHNhdmVDdXJzb3JDb29yZGluYXRlID0gZnVuY3Rpb24gc2F2ZUN1cnNvckNvb3JkaW5hdGUoY29vcmRpbmF0ZSl7XHJcbiAgICBzdGF0ZS5sYXN0WFkgPSBjb29yZGluYXRlO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1vdmVDaXJjbGUgPSBmdW5jdGlvbiBtb3ZlQ2lyY2xlKGNpcmNsZUlkLGRlbHRhWCxkZWx0YVkpe1xyXG4gICAgdmFyIGNpcmNsZSA9IHN0YXRlLmNpcmNsZXNbY2lyY2xlSWRdO1xyXG4gICAgaWYoIWNpcmNsZSkgcmV0dXJuO1xyXG4gICAgY2lyY2xlLmN4ICs9IGRlbHRhWDtcclxuICAgIGNpcmNsZS5jeSArPSBkZWx0YVk7XHJcbiAgICBlbWl0Q2hhbmdlKCk7XHJcbn07XHJcbiJdfQ==
