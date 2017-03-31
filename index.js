(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./generation":2,"./store":5}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.INPUT_ID = undefined;

var _render = require('./render');

var _store = require('./store');

var _controller = require('./controller');

var INPUT_ID = exports.INPUT_ID = "nCircles";

// -----------------------------------------------------------------------------
// Helper

/* index.js */

// This will also contain much of the "view" part of an MVC architecture.
function getCanvas() {
    return document.getElementById("myCanvas");
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
    var inputElm = document.getElementById(INPUT_ID);
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

        // Once I'm done moving the circle, clear the background.
    } else if (movingACircle && state.activeCircle === null) {
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

    var inputElm = document.getElementById(INPUT_ID);
    inputElm.addEventListener('change', onNumberOfCirclesChange);

    // initialize
    inputElm.defaultValue = (0, _store.getState)().numberOfCircles;
    (0, _store.addChangeListener)(update);

    (0, _store.setNumberOfCircles)(5);
};

},{"./controller":1,"./render":4,"./store":5}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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

},{"./generation":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGNvbnRyb2xsZXIuanMiLCJzcmNcXGdlbmVyYXRpb24uanMiLCJzcmNcXGluZGV4LmpzIiwic3JjXFxyZW5kZXIuanMiLCJzcmNcXHN0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztBQ0dBOztBQU9BOztBQVZBO0FBQ0E7O0FBV0EsU0FBUyxzQkFBVCxDQUFnQyxLQUFoQyxFQUFzQztBQUNsQyxRQUFNLFVBQVUsdUJBQVcsT0FBWCxDQUFtQixNQUFuQixDQUNaLGFBQUs7QUFDRCxZQUFHLEtBQUssR0FBTCxDQUFTLE1BQU0sQ0FBTixHQUFVLEVBQUUsRUFBckIsSUFBMkIsRUFBRSxDQUFoQyxFQUFtQyxPQUFPLEtBQVA7QUFDbkMsWUFBRyxLQUFLLEdBQUwsQ0FBUyxNQUFNLENBQU4sR0FBVSxFQUFFLEVBQXJCLElBQTJCLEVBQUUsQ0FBaEMsRUFBbUMsT0FBTyxLQUFQO0FBQ25DLGVBQU8sSUFBUDtBQUNILEtBTFcsQ0FBaEI7O0FBU0EsUUFBTSxTQUFTLFFBQVEsTUFBUixDQUFlLGFBQUs7QUFDL0IsWUFBSSxJQUFJLDBCQUNKLEVBQUMsR0FBRSxFQUFFLEVBQUwsRUFBUyxHQUFFLEVBQUUsRUFBYixFQURJLEVBRUosS0FGSSxDQUFSO0FBSUEsZUFBTyxJQUFJLEVBQUUsQ0FBYjtBQUNILEtBTmMsQ0FBZjs7QUFRQSxXQUFPLE9BQU8sQ0FBUCxLQUFhLE9BQU8sQ0FBUCxFQUFVLEVBQTlCO0FBQ0g7O0FBRU0sSUFBTSw4REFBMkIsU0FBUyx3QkFBVCxDQUFrQyxDQUFsQyxFQUFvQyxDQUFwQyxFQUFzQztBQUMxRSxRQUFJLFdBQVcsdUJBQXVCLEVBQUMsSUFBRCxFQUFHLElBQUgsRUFBdkIsQ0FBZjtBQUNBLGdDQUFnQixRQUFoQjtBQUNBLHFDQUFxQixFQUFDLElBQUQsRUFBRyxJQUFILEVBQXJCO0FBQ0gsQ0FKTTs7QUFNQSxJQUFNLHdD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QUFNLFlBQU4sR0FBcUIsTUFBckI7QUFDQSxVQUFNLFdBQU4sR0FBb0IsS0FBcEI7QUFDQTtBQUNBO0FBQ0gsQ0FMTTs7QUFPQSxJQUFNLGtEQUFxQixTQUFTLGtCQUFULENBQTRCLGVBQTVCLEVBQTRDO0FBQzFFLFVBQU0sZUFBTixHQUF3QixlQUF4QjtBQUNBO0FBQ0E7QUFDSCxDQUpNOztBQU1BLElBQU0sNENBQWtCLFNBQVMsZUFBVCxDQUF5QixRQUF6QixFQUFrQztBQUM3RCxVQUFNLFlBQU4sR0FBcUIsUUFBckI7QUFDQTtBQUNILENBSE07O0FBS0EsSUFBTSxzREFBdUIsU0FBUyxvQkFBVCxDQUE4QixVQUE5QixFQUF5QztBQUN6RSxVQUFNLE1BQU4sR0FBZSxVQUFmO0FBQ0gsQ0FGTTs7QUFJQSxJQUFNLGtDQUFhLFNBQVMsVUFBVCxDQUFvQixRQUFwQixFQUE2QixNQUE3QixFQUFvQyxNQUFwQyxFQUEyQztBQUNqRSxRQUFJLFNBQVMsTUFBTSxPQUFOLENBQWMsUUFBZCxDQUFiO0FBQ0EsUUFBRyxDQUFDLE1BQUosRUFBWTtBQUNaLFdBQU8sRUFBUCxJQUFhLE1BQWI7QUFDQSxXQUFPLEVBQVAsSUFBYSxNQUFiO0FBQ0E7QUFDSCxDQU5NIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGNvbnRyb2xsZXIuanMgKi9cclxuLy8gVGhlIEMgaW4gTVZDLiAgQmFzaWNhbGx5IGdsdWUgY29kZS5cclxuXHJcbmltcG9ydCB7XHJcbiAgICBnZXRTdGF0ZSxcclxuICAgIHNldEFjdGl2ZUNpcmNsZSxcclxuICAgIHNhdmVDdXJzb3JDb29yZGluYXRlLFxyXG4gICAgbW92ZUNpcmNsZVxyXG59IGZyb20gJy4vc3RvcmUnO1xyXG5cclxuaW1wb3J0IHtkaXN0YW5jZX0gZnJvbSAnLi9nZW5lcmF0aW9uJztcclxuXHJcbmZ1bmN0aW9uIGZpbmRDaXJjbGVBdENvb3JkaW5hdGUoY29vcmQpe1xyXG4gICAgY29uc3QgcmVkdWNlZCA9IGdldFN0YXRlKCkuY2lyY2xlcy5maWx0ZXIoXHJcbiAgICAgICAgYyA9PiB7XHJcbiAgICAgICAgICAgIGlmKE1hdGguYWJzKGNvb3JkLnggLSBjLmN4KSA+IGMucikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZihNYXRoLmFicyhjb29yZC55IC0gYy5jeSkgPiBjLnIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxuXHJcblxyXG4gICAgY29uc3QgY2lyY2xlID0gcmVkdWNlZC5maWx0ZXIoYyA9PiB7XHJcbiAgICAgICAgdmFyIGQgPSBkaXN0YW5jZShcclxuICAgICAgICAgICAge3g6Yy5jeCwgeTpjLmN5fSxcclxuICAgICAgICAgICAgY29vcmRcclxuICAgICAgICApO1xyXG4gICAgICAgIHJldHVybiBkIDwgYy5yO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNpcmNsZVswXSAmJiBjaXJjbGVbMF0uaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUgPSBmdW5jdGlvbiBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUoeCx5KXtcclxuICAgIGxldCBjaXJjbGVJZCA9IGZpbmRDaXJjbGVBdENvb3JkaW5hdGUoe3gseX0pO1xyXG4gICAgc2V0QWN0aXZlQ2lyY2xlKGNpcmNsZUlkKTtcclxuICAgIHNhdmVDdXJzb3JDb29yZGluYXRlKHt4LHl9KTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCByZWxlYXNlQ2lyY2xlID0gZnVuY3Rpb24gcmVsZWFzZUNpcmNsZSgpe1xyXG4gICAgc2V0QWN0aXZlQ2lyY2xlKG51bGwpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1vdmVDdXJzb3IgPSBmdW5jdGlvbiBtb3ZlQ3Vyc29yKHgseSl7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XHJcbiAgICBpZihzdGF0ZS5hY3RpdmVDaXJjbGUgPT09IG51bGwpIHJldHVybjsgLy8gbm8gY2lyY2xlIHNlbGVjdGVkLlxyXG5cclxuICAgIGNvbnN0IGRYID0geCAtIHN0YXRlLmxhc3RYWS54LFxyXG4gICAgICAgICAgZFkgPSB5IC0gc3RhdGUubGFzdFhZLnk7XHJcbiAgICBtb3ZlQ2lyY2xlKHN0YXRlLmFjdGl2ZUNpcmNsZSxkWCxkWSk7XHJcbiAgICBzYXZlQ3Vyc29yQ29vcmRpbmF0ZSh7eCx5fSk7XHJcbn07XHJcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFV0aWxpdHlcclxuXHJcbmZ1bmN0aW9uIHJhbmRCZXR3ZWVuKG1pbixtYXgpe1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoobWF4LW1pbisxKSkrbWluO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXN0YW5jZShjQSxjQil7XHJcbiAgICB2YXIgaSwgZD0gMC4wO1xyXG4gICAgZm9yKGkgaW4gY0Epe1xyXG4gICAgICAgIHZhciBkZWx0YSA9IGNBW2ldLWNCW2ldO1xyXG4gICAgICAgIGQgKz0gZGVsdGEqZGVsdGE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGQpO1xyXG59XHJcblxyXG5leHBvcnQge2Rpc3RhbmNlfTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFByb3hpbWl0eSBEZXRlY3Rpb25cclxuXHJcbmZ1bmN0aW9uIGNhbkluc2VydChhcnIsY29vcmRpbmF0ZSxwcm94aW1pdHkpe1xyXG4gICAgdmFyIHJlZHVjZWQgPSBhcnIuZmlsdGVyKCBjID0+IHtcclxuXHJcbiAgICAgICAgdmFyIGk7XHJcbiAgICAgICAgZm9yKGkgaW4gYyl7XHJcbiAgICAgICAgICAgIGlmKE1hdGguYWJzKCBjW2ldIC0gY29vcmRpbmF0ZVtpXSApID4gcHJveGltaXR5KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKHJlZHVjZWQpO1xyXG5cclxuICAgIHJldHVybiAhcmVkdWNlZC5zb21lKCBjID0+IChkaXN0YW5jZShjLGNvb3JkaW5hdGUpIDwgcHJveGltaXR5KSk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENvb3JkaW5hdGVzXHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNvb3JkaW5hdGVzKHtjb3VudCxyYWRpdXMsY2FudmFzSGVpZ2h0LGNhbnZhc1dpZHRofSl7XHJcbiAgICB2YXIgYXJyID0gW10sIGksIHIgPSByYWRpdXMsIHJldHJpZXMgPSAwO1xyXG5cclxuICAgIGZvcihpPTA7aTxjb3VudDtpKyspe1xyXG4gICAgICAgIHZhciBjID0ge1xyXG4gICAgICAgICAgICB4OnJhbmRCZXR3ZWVuKHIsY2FudmFzV2lkdGgtciksXHJcbiAgICAgICAgICAgIHk6cmFuZEJldHdlZW4ocixjYW52YXNIZWlnaHQtcilcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZighY2FuSW5zZXJ0KGFycixjLDIqcikpe1xyXG4gICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgIGlmKHJldHJpZXMrKyA+IDEwMDApIHJldHVybiBudWxsOyAvLyBuZWVkIHNtYWxsZXIgcmFkaXVzLlxyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFyci5wdXNoKGMpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnI7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENvbG9yc1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDb2xvcnMoe2NvdW50fSl7XHJcbiAgICB2YXIgYXJyID0gW10saSxyZXRyaWVzID0gMCxjb2xvckRpdmVyc2l0eSA9IDIwMDtcclxuICAgIGZvcihpPTA7aTxjb3VudDtpKyspe1xyXG4gICAgICAgIHZhciBjb2xvciA9IHtcclxuICAgICAgICAgICAgcjpyYW5kQmV0d2VlbigwLDI1NSksXHJcbiAgICAgICAgICAgIGc6cmFuZEJldHdlZW4oMCwyNTUpLFxyXG4gICAgICAgICAgICBiOnJhbmRCZXR3ZWVuKDAsMjU1KVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmKCFjYW5JbnNlcnQoYXJyLGNvbG9yLGNvbG9yRGl2ZXJzaXR5KSl7XHJcbiAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgaWYocmV0cmllcysrID4gMTAwMCl7XHJcbiAgICAgICAgICAgICAgICBjb2xvckRpdmVyc2l0eSAvPSAyO1xyXG4gICAgICAgICAgICAgICAgcmV0cmllcyA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcnIucHVzaChjb2xvcik7XHJcbiAgICAgICAgcmV0cmllcyA9IDA7IC8vIHJlc2V0IHJldHJpZXMuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXJyO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDaXJjbGVzXHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNpcmNsZXMoe2NvdW50LGNhbnZhc0hlaWdodCxjYW52YXNXaWR0aH0pe1xyXG4gICAgdmFyIGFyciA9IFtdLCBpO1xyXG5cclxuICAgIHZhciByID0gNTAsIGNvbG9yO1xyXG5cclxuICAgIHZhciBjb29yZHM7XHJcbiAgICB3aGlsZSggIShjb29yZHMgPSBnZW5lcmF0ZUNvb3JkaW5hdGVzKHtjb3VudDpjb3VudCxyYWRpdXM6cixjYW52YXNIZWlnaHQsY2FudmFzV2lkdGh9KSkgKXtcclxuICAgICAgICByLT01O1xyXG4gICAgICAgIGlmKHIgPT09IDApIHRocm93IFwiVG9vIG1hbnkgY2lyY2xlc1wiO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IGdlbmVyYXRlQ29sb3JzKHtjb3VudDpjb3VudH0pO1xyXG5cclxuICAgIGZvciggaSA9IDA7IGkgPCBjb3VudDsgaSsrICl7XHJcblxyXG4gICAgICAgIGNvbG9yID0gXCJyZ2IoXCIrIFtjb2xvcnNbaV0uciwgY29sb3JzW2ldLmcsIGNvbG9yc1tpXS5iXS5qb2luKCcsJykrIFwiKVwiO1xyXG5cclxuICAgICAgICBhcnIucHVzaCh7XHJcbiAgICAgICAgICAgIGlkOmksXHJcbiAgICAgICAgICAgIGN4OmNvb3Jkc1tpXS54LFxyXG4gICAgICAgICAgICBjeTpjb29yZHNbaV0ueSxcclxuICAgICAgICAgICAgcixcclxuICAgICAgICAgICAgY29sb3JcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgcmV0dXJuIGFycjtcclxufVxyXG5cclxuZXhwb3J0IHtnZW5lcmF0ZUNpcmNsZXN9O1xyXG4iLCIvKiBpbmRleC5qcyAqL1xyXG5cclxuLy8gVGhpcyB3aWxsIGFsc28gY29udGFpbiBtdWNoIG9mIHRoZSBcInZpZXdcIiBwYXJ0IG9mIGFuIE1WQyBhcmNoaXRlY3R1cmUuXHJcbmltcG9ydCB7XHJcbiAgICBjbGVhcixcclxuICAgIGRyYXdDaXJjbGVzLFxyXG4gICAgZHJhd0JlemllckN1cnZlRnJvbUFUb0JcclxufSBmcm9tICcuL3JlbmRlcic7XHJcblxyXG5pbXBvcnQge1xyXG4gICAgZ2V0U3RhdGUsXHJcbiAgICBzZXRDYW52YXNEaW1lbnNpb25zLFxyXG4gICAgc2V0TnVtYmVyT2ZDaXJjbGVzLFxyXG4gICAgYWRkQ2hhbmdlTGlzdGVuZXJcclxufSBmcm9tICcuL3N0b3JlJztcclxuXHJcbmltcG9ydCB7XHJcbiAgICBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUsXHJcbiAgICByZWxlYXNlQ2lyY2xlLFxyXG4gICAgbW92ZUN1cnNvclxyXG59IGZyb20gJy4vY29udHJvbGxlcic7XHJcblxyXG5leHBvcnQgY29uc3QgSU5QVVRfSUQgPSBcIm5DaXJjbGVzXCI7XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBIZWxwZXJcclxuXHJcbmZ1bmN0aW9uIGdldENhbnZhcygpe1xyXG4gICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibXlDYW52YXNcIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEN1cnNvclBvc2l0aW9uKGNhbnZhcywgZXZlbnQpIHtcclxuICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgdmFyIHggPSBldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0O1xyXG4gICAgdmFyIHkgPSBldmVudC5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICByZXR1cm4ge3gseX07XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFVwZGF0ZSAvIFJlbmRlclxyXG5cclxudmFyIG1vdmluZ0FDaXJjbGUgPSBmYWxzZTtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZSgpe1xyXG4gICAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xyXG5cclxuICAgIC8vIE51bWJlciBvZiBDaXJjbGVzIGlucHV0XHJcbiAgICB2YXIgaW5wdXRFbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJTlBVVF9JRCk7XHJcbiAgICBpbnB1dEVsbS5kZWZhdWx0VmFsdWUgPSBzdGF0ZS5udW1iZXJPZkNpcmNsZXM7XHJcblxyXG4gICAgLy8gQ29vcmRpbmF0ZSBEaXNwbGF5XHJcbiAgICB2YXIgY29vcmRpbmF0ZUVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2lyY2xlLWNvb3JkaW5hdGVzXCIpO1xyXG4gICAgdmFyIGNpcmNsZSA9IHN0YXRlLmNpcmNsZXNbc3RhdGUuYWN0aXZlQ2lyY2xlXTtcclxuICAgIGNvb3JkaW5hdGVFbG0uaW5uZXJIVE1MID0gY2lyY2xlID8gKFwiKFwiICsgY2lyY2xlLmN4ICsgXCIsXCIgKyBjaXJjbGUuY3kgKyBcIilcIikgOiBcIlwiO1xyXG5cclxuICAgIC8vIENBTlZBU1xyXG5cclxuICAgIHZhciBmb3JlZ3JvdW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215Q2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIHZhciBiYWNrZ3JvdW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215QmFja2dyb3VuZENhbnZhcycpLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhd1RoZUJlemllckN1cnZlKGNvbnRleHQpe1xyXG4gICAgICAgIGRyYXdCZXppZXJDdXJ2ZUZyb21BVG9CKFxyXG4gICAgICAgICAgICBjb250ZXh0LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICB4OnN0YXRlLmNpcmNsZXNbMF0uY3gsXHJcbiAgICAgICAgICAgICAgICB5OnN0YXRlLmNpcmNsZXNbMF0uY3lcclxuICAgICAgICAgICAgfSx7XHJcbiAgICAgICAgICAgICAgICB4OnN0YXRlLmNpcmNsZXNbMV0uY3gsXHJcbiAgICAgICAgICAgICAgICB5OnN0YXRlLmNpcmNsZXNbMV0uY3lcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3RhdGUuY2lyY2xlc1swXS5yXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJIHdpbGwgYmUgbW92aW5nIGEgY2lyY2xlLiAgUmVuZGVyIG5vbi1yZWxldmFudFxyXG4gICAgLy8gaXRlbXMgaW4gdGhlIGJhY2tncm91bmQuXHJcbiAgICBpZighbW92aW5nQUNpcmNsZSAmJiBzdGF0ZS5hY3RpdmVDaXJjbGUgIT09IG51bGwpe1xyXG5cclxuICAgICAgICBjbGVhcihiYWNrZ3JvdW5kKTtcclxuXHJcbiAgICAgICAgaWYoc3RhdGUuYWN0aXZlQ2lyY2xlIDwgMil7XHJcbiAgICAgICAgICAgIGRyYXdDaXJjbGVzKGJhY2tncm91bmQsc3RhdGUuY2lyY2xlcy5zbGljZSgyKSk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGRyYXdDaXJjbGVzKGJhY2tncm91bmQsc3RhdGUuY2lyY2xlcy5zbGljZSgwLHN0YXRlLmFjdGl2ZUNpcmNsZSkuY29uY2F0KHN0YXRlLmNpcmNsZXMuc2xpY2Uoc3RhdGUuYWN0aXZlQ2lyY2xlKzEpKSk7XHJcbiAgICAgICAgICAgIGRyYXdUaGVCZXppZXJDdXJ2ZShiYWNrZ3JvdW5kKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmluZ0FDaXJjbGUgPSB0cnVlO1xyXG5cclxuICAgIC8vIE9uY2UgSSdtIGRvbmUgbW92aW5nIHRoZSBjaXJjbGUsIGNsZWFyIHRoZSBiYWNrZ3JvdW5kLlxyXG4gICAgfWVsc2UgaWYobW92aW5nQUNpcmNsZSAmJiBzdGF0ZS5hY3RpdmVDaXJjbGUgPT09IG51bGwpe1xyXG4gICAgICAgIGNsZWFyKGJhY2tncm91bmQpO1xyXG4gICAgICAgIG1vdmluZ0FDaXJjbGUgPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBpZihtb3ZpbmdBQ2lyY2xlKXtcclxuICAgICAgICBjbGVhcihmb3JlZ3JvdW5kKTtcclxuICAgICAgICBpZihzdGF0ZS5hY3RpdmVDaXJjbGUgPCAyKXtcclxuICAgICAgICAgICAgZHJhd0NpcmNsZXMoZm9yZWdyb3VuZCxzdGF0ZS5jaXJjbGVzLnNsaWNlKDAsMikpO1xyXG4gICAgICAgICAgICBkcmF3VGhlQmV6aWVyQ3VydmUoZm9yZWdyb3VuZCk7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIGRyYXdDaXJjbGVzKGZvcmVncm91bmQsW3N0YXRlLmNpcmNsZXNbc3RhdGUuYWN0aXZlQ2lyY2xlXV0pO1xyXG4gICAgICAgIH1cclxuICAgIH1lbHNle1xyXG5cclxuICAgICAgICBjbGVhcihmb3JlZ3JvdW5kKTtcclxuICAgICAgICBkcmF3Q2lyY2xlcyhmb3JlZ3JvdW5kLCBzdGF0ZS5jaXJjbGVzICk7XHJcblxyXG4gICAgICAgIGlmKHN0YXRlLm51bWJlck9mQ2lyY2xlcyA+PSAyKXtcclxuICAgICAgICAgICAgZHJhd1RoZUJlemllckN1cnZlKGZvcmVncm91bmQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIEV2ZW50IEhhbmRsaW5nXHJcblxyXG5mdW5jdGlvbiBvbk51bWJlck9mQ2lyY2xlc0NoYW5nZShlKXtcclxuICAgIHZhciBuQ2lyY2xlcyA9IHBhcnNlSW50KGUudGFyZ2V0LnZhbHVlKSB8fCAwO1xyXG4gICAgc2V0TnVtYmVyT2ZDaXJjbGVzKG5DaXJjbGVzKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTW91c2VEb3duKGV2ZW50KXtcclxuICAgIGNvbnN0IGNhbnZhcyA9IGdldENhbnZhcygpO1xyXG4gICAgY29uc3QgY3Vyc29yID0gZ2V0Q3Vyc29yUG9zaXRpb24oY2FudmFzLGV2ZW50KTtcclxuXHJcbiAgICBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUoY3Vyc29yLngsY3Vyc29yLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVNb3VzZU1vdmUoZXZlbnQpe1xyXG4gICAgY29uc3QgY2FudmFzID0gZ2V0Q2FudmFzKCk7XHJcbiAgICBjb25zdCBjdXJzb3IgPSBnZXRDdXJzb3JQb3NpdGlvbihjYW52YXMsZXZlbnQpO1xyXG5cclxuICAgIG1vdmVDdXJzb3IoY3Vyc29yLngsY3Vyc29yLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBoYW5kbGVNb3VzZVVwKCl7XHJcbiAgICByZWxlYXNlQ2lyY2xlKCk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIEluaXRpYWxpemF0aW9uXHJcblxyXG53aW5kb3cub25sb2FkID0gKCk9PntcclxuXHJcbiAgICAvLyBhZGp1c3QgY2FudmFzIGRpbWluZW5zaW9uc1xyXG4gICAgdmFyIGNhbnZhcyA9IGdldENhbnZhcygpO1xyXG4gICAgY2FudmFzLmhlaWdodCA9IGNhbnZhcy5wYXJlbnROb2RlLm9mZnNldEhlaWdodDtcclxuICAgIGNhbnZhcy53aWR0aCA9IGNhbnZhcy5wYXJlbnROb2RlLm9mZnNldFdpZHRoO1xyXG4gICAgdmFyIGJnQ2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215QmFja2dyb3VuZENhbnZhcycpO1xyXG4gICAgYmdDYW52YXMuaGVpZ2h0ID0gY2FudmFzLmhlaWdodDtcclxuICAgIGJnQ2FudmFzLndpZHRoID0gY2FudmFzLndpZHRoO1xyXG5cclxuICAgIHNldENhbnZhc0RpbWVuc2lvbnMoY2FudmFzLmhlaWdodCxjYW52YXMud2lkdGgpO1xyXG5cclxuICAgIC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsaGFuZGxlTW91c2VEb3duKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsaGFuZGxlTW91c2VNb3ZlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLGhhbmRsZU1vdXNlVXApO1xyXG5cclxuICAgIHZhciBpbnB1dEVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElOUFVUX0lEKTtcclxuICAgIGlucHV0RWxtLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsb25OdW1iZXJPZkNpcmNsZXNDaGFuZ2UpO1xyXG5cclxuICAgIC8vIGluaXRpYWxpemVcclxuICAgIGlucHV0RWxtLmRlZmF1bHRWYWx1ZSA9IGdldFN0YXRlKCkubnVtYmVyT2ZDaXJjbGVzO1xyXG4gICAgYWRkQ2hhbmdlTGlzdGVuZXIodXBkYXRlKTtcclxuXHJcbiAgICBzZXROdW1iZXJPZkNpcmNsZXMoNSk7XHJcbn07XHJcbiIsImZ1bmN0aW9uIGRyYXdDaXJjbGUoY3R4LHtjeD01MCxjeT01MCxyPTUwLGNvbG9yPVwiI2YwMFwifT17fSl7XHJcbiAgICBjdHguZmlsbFN0eWxlPWNvbG9yO1xyXG5cclxuICAgIC8vIGFkZCBzaGFkb3cgdG8gY2lyY2xlXHJcbiAgICBjdHguc2hhZG93T2Zmc2V0WSA9IDQ7XHJcbiAgICBjdHguc2hhZG93Qmx1ciA9IDQ7XHJcbiAgICBjdHguc2hhZG93Q29sb3IgPSBcInJnYmEoMCwwLDAsMC42KVwiO1xyXG5cclxuICAgIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgICAvLyBtYWluIGNpcmNsZVxyXG4gICAgY3R4LmFyYyhcclxuICAgICAgICBjeCxcclxuICAgICAgICBjeSxcclxuICAgICAgICByLFxyXG4gICAgICAgIDAsXHJcbiAgICAgICAgTWF0aC5QSSAqIDIsXHJcbiAgICAgICAgdHJ1ZVxyXG4gICAgKTtcclxuICAgIGN0eC5maWxsKCk7XHJcbiAgICBjdHguY2xvc2VQYXRoKCk7XHJcblxyXG4gICAgLy8gcmVzZXQgc2hhZG93IHBhcmFtZXRlcnNcclxuICAgIGN0eC5zaGFkb3dPZmZzZXRZID0gMDtcclxuICAgIGN0eC5zaGFkb3dCbHVyID0gMDtcclxuICAgIGN0eC5zaGFkb3dDb2xvciA9IFwidHJhbnNwYXJlbnRcIjtcclxuXHJcbiAgICAvLyBib3JkZXIuXHJcbiAgICBjb25zdCBib3JkZXJzID0gW3tcclxuICAgICAgICBvZmZzZXQ6LTMsXHJcbiAgICAgICAgd2lkdGg6NixcclxuICAgICAgICBjb2xvcjpcImJsYWNrXCJcclxuICAgIH0se1xyXG4gICAgICAgIG9mZnNldDotMyxcclxuICAgICAgICB3aWR0aDozLFxyXG4gICAgICAgIGNvbG9yOlwid2hpdGVcIlxyXG4gICAgfV07XHJcblxyXG4gICAgdmFyIGksbCA9IGJvcmRlcnMubGVuZ3RoO1xyXG4gICAgZm9yKGk9MDtpPGw7aSsrKXtcclxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBib3JkZXJzW2ldLmNvbG9yO1xyXG4gICAgICAgIGN0eC5saW5lV2lkdGggPSBib3JkZXJzW2ldLndpZHRoO1xyXG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcclxuICAgICAgICBjdHguYXJjKFxyXG4gICAgICAgICAgICBjeCxcclxuICAgICAgICAgICAgY3ksXHJcbiAgICAgICAgICAgIHIgKyBib3JkZXJzW2ldLm9mZnNldCxcclxuICAgICAgICAgICAgMCxcclxuICAgICAgICAgICAgTWF0aC5QSSoyLFxyXG4gICAgICAgICAgICB0cnVlXHJcbiAgICAgICAgKTtcclxuICAgICAgICBjdHguc3Ryb2tlKCk7XHJcbiAgICAgICAgY3R4LmNsb3NlUGF0aCgpO1xyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNsZWFyKGNvbnRleHQpe1xyXG4gICAgLy8gY2xlYXIgY2FudmFzXHJcbiAgICBjb250ZXh0LmNsZWFyUmVjdCgwLDAsY29udGV4dC5jYW52YXMud2lkdGgsY29udGV4dC5jYW52YXMuaGVpZ2h0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0NpcmNsZXMoY29udGV4dCxjaXJjbGVzKXtcclxuICAgIC8vIGRyYXcgY2lyY2xlc1xyXG4gICAgdmFyIGk7XHJcbiAgICBmb3IoaT0wO2k8Y2lyY2xlcy5sZW5ndGg7aSsrKXtcclxuICAgICAgICBkcmF3Q2lyY2xlKGNvbnRleHQsY2lyY2xlc1tpXSk7XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBkcmF3QmV6aWVyQ3VydmVGcm9tQVRvQihjb250ZXh0LCBwb2ludEEscG9pbnRCLHJhZGl1cyl7XHJcbiAgICAvLyBsZWZ0bW9zdCBwb2ludCBpcyBcInN0YXJ0XCIsIG90aGVyIGlzIFwiZW5kXCJcclxuICAgIGxldCBzdGFydCA9IHBvaW50QSxcclxuICAgICAgICBlbmQgPSBwb2ludEI7XHJcblxyXG4gICAgaWYocG9pbnRBLnggPiBwb2ludEIueCl7XHJcbiAgICAgICAgc3RhcnQgPSBwb2ludEIsIGVuZCA9IHBvaW50QTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpZiB0aGUgZW5kIGlzIG5vdCBjb21wbGV0ZWx5IHJpZ2h0IG9mIHRoZSBzdGFydCBwb2ludC5cclxuICAgIHZhciBhYm92ZSA9IChzdGFydC54ICsgcmFkaXVzID4gZW5kLnggLSByYWRpdXMpO1xyXG5cclxuICAgIGxldCBzdGFydFggPSAoYWJvdmUpID8gKHN0YXJ0LnggLSByYWRpdXMpIDogKHN0YXJ0LnggKyByYWRpdXMpLFxyXG4gICAgICAgIHN0YXJ0WSA9IHN0YXJ0LnksXHJcbiAgICAgICAgZW5kWCA9IGVuZC54IC0gcmFkaXVzLFxyXG4gICAgICAgIGVuZFkgPSBlbmQueTtcclxuXHJcbiAgICBjb250ZXh0LnN0cm9rZVN0eWxlID0gXCJ3aGl0ZVwiO1xyXG4gICAgY29udGV4dC5saW5lV2lkdGggPSBcIjNcIjtcclxuICAgIGNvbnRleHQuYmVnaW5QYXRoKCk7XHJcbiAgICBjb250ZXh0Lm1vdmVUbyhzdGFydFgsc3RhcnRZKTtcclxuICAgIGlmKGFib3ZlKXtcclxuICAgICAgICBjb250ZXh0LmJlemllckN1cnZlVG8oXHJcbiAgICAgICAgICAgIHN0YXJ0WC0yMCxcclxuICAgICAgICAgICAgc3RhcnRZLFxyXG4gICAgICAgICAgICBzdGFydFgtMjAsXHJcbiAgICAgICAgICAgIGVuZFksXHJcbiAgICAgICAgICAgIGVuZFgsXHJcbiAgICAgICAgICAgIGVuZFlcclxuICAgICAgICApO1xyXG4gICAgfWVsc2V7XHJcbiAgICAgICAgdmFyIGhhbGYgPSAoZW5kWCAtIHN0YXJ0WCkgLyAyO1xyXG4gICAgICAgIGNvbnRleHQuYmV6aWVyQ3VydmVUbyhcclxuICAgICAgICAgICAgc3RhcnRYK2hhbGYsXHJcbiAgICAgICAgICAgIHN0YXJ0WSxcclxuICAgICAgICAgICAgZW5kWC1oYWxmLFxyXG4gICAgICAgICAgICBlbmRZLFxyXG4gICAgICAgICAgICBlbmRYLFxyXG4gICAgICAgICAgICBlbmRZXHJcbiAgICAgICAgKTtcclxuICAgIH1cclxuICAgIGNvbnRleHQuc3Ryb2tlKCk7XHJcbiAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xyXG59XHJcblxyXG5leHBvcnQge1xyXG4gICAgY2xlYXIsXHJcbiAgICBkcmF3Q2lyY2xlcyxcclxuICAgIGRyYXdCZXppZXJDdXJ2ZUZyb21BVG9CXHJcbn07XHJcbiIsImltcG9ydCB7Z2VuZXJhdGVDaXJjbGVzfSBmcm9tICcuL2dlbmVyYXRpb24nO1xyXG5cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFN0YXRlXHJcblxyXG5sZXQgc3RhdGUgPSB7XHJcbiAgICBudW1iZXJPZkNpcmNsZXM6MCxcclxuICAgIGNpcmNsZXM6W10sXHJcbiAgICBhY3RpdmVDaXJjbGU6bnVsbCxcclxuICAgIGxhc3RYWTp7eDowLHk6MH0sXHJcbiAgICBjYW52YXNIZWlnaHQ6MCxcclxuICAgIGNhbnZhc1dpZHRoOjBcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRTdGF0ZSA9IGZ1bmN0aW9uIGdldFN0YXRlKCl7XHJcbiAgICByZXR1cm4gc3RhdGU7XHJcbn07XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDaGFuZ2UgTGlzdGVuaW5nIE1lY2hhbmlzbVxyXG5cclxubGV0IGNoYW5nZUxpc3RlbmVycyA9IFtdO1xyXG5cclxuZXhwb3J0IGNvbnN0IGFkZENoYW5nZUxpc3RlbmVyID0gZnVuY3Rpb24gYWRkQ2hhbmdlTGlzdGVuZXIoY2FsbGJhY2spe1xyXG4gICAgY2hhbmdlTGlzdGVuZXJzLnB1c2goY2FsbGJhY2spO1xyXG59O1xyXG5cclxuZnVuY3Rpb24gZW1pdENoYW5nZSgpe1xyXG4gICAgdmFyIGksIGwgPSBjaGFuZ2VMaXN0ZW5lcnMubGVuZ3RoO1xyXG4gICAgZm9yKGk9MDtpPGw7aSsrKXtcclxuICAgICAgICBjaGFuZ2VMaXN0ZW5lcnNbaV0oKTtcclxuICAgIH1cclxufVxyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gQWN0aW9uc1xyXG5cclxuZnVuY3Rpb24gcmVnZW5lcmF0ZUNpcmNsZXMoKXtcclxuICAgIHN0YXRlLmNpcmNsZXMgPSBnZW5lcmF0ZUNpcmNsZXMoe1xyXG4gICAgICAgIGNvdW50OiBzdGF0ZS5udW1iZXJPZkNpcmNsZXMsXHJcbiAgICAgICAgY2FudmFzV2lkdGg6IHN0YXRlLmNhbnZhc1dpZHRoLFxyXG4gICAgICAgIGNhbnZhc0hlaWdodDogc3RhdGUuY2FudmFzSGVpZ2h0XHJcbiAgICB9KTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHNldENhbnZhc0RpbWVuc2lvbnMgPSBmdW5jdGlvbiBzZXRDYW52YXNEaW1lbnNpb25zKGhlaWdodCx3aWR0aCl7XHJcbiAgICBzdGF0ZS5jYW52YXNIZWlnaHQgPSBoZWlnaHQ7XHJcbiAgICBzdGF0ZS5jYW52YXNXaWR0aCA9IHdpZHRoO1xyXG4gICAgcmVnZW5lcmF0ZUNpcmNsZXMoKTtcclxuICAgIGVtaXRDaGFuZ2UoKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBzZXROdW1iZXJPZkNpcmNsZXMgPSBmdW5jdGlvbiBzZXROdW1iZXJPZkNpcmNsZXMobnVtYmVyT2ZDaXJjbGVzKXtcclxuICAgIHN0YXRlLm51bWJlck9mQ2lyY2xlcyA9IG51bWJlck9mQ2lyY2xlcztcclxuICAgIHJlZ2VuZXJhdGVDaXJjbGVzKCk7XHJcbiAgICBlbWl0Q2hhbmdlKCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgc2V0QWN0aXZlQ2lyY2xlID0gZnVuY3Rpb24gc2V0QWN0aXZlQ2lyY2xlKGNpcmNsZUlkKXtcclxuICAgIHN0YXRlLmFjdGl2ZUNpcmNsZSA9IGNpcmNsZUlkO1xyXG4gICAgZW1pdENoYW5nZSgpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHNhdmVDdXJzb3JDb29yZGluYXRlID0gZnVuY3Rpb24gc2F2ZUN1cnNvckNvb3JkaW5hdGUoY29vcmRpbmF0ZSl7XHJcbiAgICBzdGF0ZS5sYXN0WFkgPSBjb29yZGluYXRlO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1vdmVDaXJjbGUgPSBmdW5jdGlvbiBtb3ZlQ2lyY2xlKGNpcmNsZUlkLGRlbHRhWCxkZWx0YVkpe1xyXG4gICAgdmFyIGNpcmNsZSA9IHN0YXRlLmNpcmNsZXNbY2lyY2xlSWRdO1xyXG4gICAgaWYoIWNpcmNsZSkgcmV0dXJuO1xyXG4gICAgY2lyY2xlLmN4ICs9IGRlbHRhWDtcclxuICAgIGNpcmNsZS5jeSArPSBkZWx0YVk7XHJcbiAgICBlbWl0Q2hhbmdlKCk7XHJcbn07XHJcbiJdfQ==
