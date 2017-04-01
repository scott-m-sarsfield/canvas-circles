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
        if (state.numberOfCircles < 2) return; // can't draw the curve...
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
    if (circleId === undefined) circleId = null;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGNvbnRyb2xsZXIuanMiLCJzcmNcXGdlbmVyYXRpb24uanMiLCJzcmNcXGluZGV4LmpzIiwic3JjXFxyZW5kZXIuanMiLCJzcmNcXHN0b3JlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7OztBQ0dBOztBQU9BOztBQVZBO0FBQ0E7O0FBV0EsU0FBUyxzQkFBVCxDQUFnQyxLQUFoQyxFQUFzQztBQUNsQyxRQUFNLFVBQVUsdUJBQVcsT0FBWCxDQUFtQixNQUFuQixDQUNaLGFBQUs7QUFDRCxZQUFHLEtBQUssR0FBTCxDQUFTLE1BQU0sQ0FBTixHQUFVLEVBQUUsRUFBckIsSUFBMkIsRUFBRSxDQUFoQyxFQUFtQyxPQUFPLEtBQVA7QUFDbkMsWUFBRyxLQUFLLEdBQUwsQ0FBUyxNQUFNLENBQU4sR0FBVSxFQUFFLEVBQXJCLElBQTJCLEVBQUUsQ0FBaEMsRUFBbUMsT0FBTyxLQUFQO0FBQ25DLGVBQU8sSUFBUDtBQUNILEtBTFcsQ0FBaEI7O0FBU0EsUUFBTSxTQUFTLFFBQVEsTUFBUixDQUFlLGFBQUs7QUFDL0IsWUFBSSxJQUFJLDBCQUNKLEVBQUMsR0FBRSxFQUFFLEVBQUwsRUFBUyxHQUFFLEVBQUUsRUFBYixFQURJLEVBRUosS0FGSSxDQUFSO0FBSUEsZUFBTyxJQUFJLEVBQUUsQ0FBYjtBQUNILEtBTmMsQ0FBZjs7QUFRQSxXQUFPLE9BQU8sQ0FBUCxLQUFhLE9BQU8sQ0FBUCxFQUFVLEVBQTlCO0FBQ0g7O0FBRU0sSUFBTSw4REFBMkIsU0FBUyx3QkFBVCxDQUFrQyxDQUFsQyxFQUFvQyxDQUFwQyxFQUFzQztBQUMxRSxRQUFJLFdBQVcsdUJBQXVCLEVBQUMsSUFBRCxFQUFHLElBQUgsRUFBdkIsQ0FBZjtBQUNBLGdDQUFnQixRQUFoQjtBQUNBLHFDQUFxQixFQUFDLElBQUQsRUFBRyxJQUFILEVBQXJCO0FBQ0gsQ0FKTTs7QUFNQSxJQUFNLHdD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LFNBQVMsbUJBQVQsQ0FBNkIsTUFBN0IsRUFBb0MsS0FBcEMsRUFBMEM7QUFDekUsVUFBTSxZQUFOLEdBQXFCLE1BQXJCO0FBQ0EsVUFBTSxXQUFOLEdBQW9CLEtBQXBCO0FBQ0E7QUFDQTtBQUNILENBTE07O0FBT0EsSUFBTSxrREFBcUIsU0FBUyxrQkFBVCxDQUE0QixlQUE1QixFQUE0QztBQUMxRSxVQUFNLGVBQU4sR0FBd0IsZUFBeEI7QUFDQTtBQUNBO0FBQ0gsQ0FKTTs7QUFNQSxJQUFNLDRDQUFrQixTQUFTLGVBQVQsQ0FBeUIsUUFBekIsRUFBa0M7QUFDN0QsUUFBRyxhQUFhLFNBQWhCLEVBQTJCLFdBQVcsSUFBWDtBQUMzQixVQUFNLFlBQU4sR0FBcUIsUUFBckI7QUFDQTtBQUNILENBSk07O0FBTUEsSUFBTSxzREFBdUIsU0FBUyxvQkFBVCxDQUE4QixVQUE5QixFQUF5QztBQUN6RSxVQUFNLE1BQU4sR0FBZSxVQUFmO0FBQ0gsQ0FGTTs7QUFJQSxJQUFNLGtDQUFhLFNBQVMsVUFBVCxDQUFvQixRQUFwQixFQUE2QixNQUE3QixFQUFvQyxNQUFwQyxFQUEyQztBQUNqRSxRQUFJLFNBQVMsTUFBTSxPQUFOLENBQWMsUUFBZCxDQUFiO0FBQ0EsUUFBRyxDQUFDLE1BQUosRUFBWTtBQUNaLFdBQU8sRUFBUCxJQUFhLE1BQWI7QUFDQSxXQUFPLEVBQVAsSUFBYSxNQUFiO0FBQ0E7QUFDSCxDQU5NIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGNvbnRyb2xsZXIuanMgKi9cclxuLy8gVGhlIEMgaW4gTVZDLiAgQmFzaWNhbGx5IGdsdWUgY29kZS5cclxuXHJcbmltcG9ydCB7XHJcbiAgICBnZXRTdGF0ZSxcclxuICAgIHNldEFjdGl2ZUNpcmNsZSxcclxuICAgIHNhdmVDdXJzb3JDb29yZGluYXRlLFxyXG4gICAgbW92ZUNpcmNsZVxyXG59IGZyb20gJy4vc3RvcmUnO1xyXG5cclxuaW1wb3J0IHtkaXN0YW5jZX0gZnJvbSAnLi9nZW5lcmF0aW9uJztcclxuXHJcbmZ1bmN0aW9uIGZpbmRDaXJjbGVBdENvb3JkaW5hdGUoY29vcmQpe1xyXG4gICAgY29uc3QgcmVkdWNlZCA9IGdldFN0YXRlKCkuY2lyY2xlcy5maWx0ZXIoXHJcbiAgICAgICAgYyA9PiB7XHJcbiAgICAgICAgICAgIGlmKE1hdGguYWJzKGNvb3JkLnggLSBjLmN4KSA+IGMucikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZihNYXRoLmFicyhjb29yZC55IC0gYy5jeSkgPiBjLnIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxuXHJcblxyXG4gICAgY29uc3QgY2lyY2xlID0gcmVkdWNlZC5maWx0ZXIoYyA9PiB7XHJcbiAgICAgICAgdmFyIGQgPSBkaXN0YW5jZShcclxuICAgICAgICAgICAge3g6Yy5jeCwgeTpjLmN5fSxcclxuICAgICAgICAgICAgY29vcmRcclxuICAgICAgICApO1xyXG4gICAgICAgIHJldHVybiBkIDwgYy5yO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNpcmNsZVswXSAmJiBjaXJjbGVbMF0uaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUgPSBmdW5jdGlvbiBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUoeCx5KXtcclxuICAgIGxldCBjaXJjbGVJZCA9IGZpbmRDaXJjbGVBdENvb3JkaW5hdGUoe3gseX0pO1xyXG4gICAgc2V0QWN0aXZlQ2lyY2xlKGNpcmNsZUlkKTtcclxuICAgIHNhdmVDdXJzb3JDb29yZGluYXRlKHt4LHl9KTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCByZWxlYXNlQ2lyY2xlID0gZnVuY3Rpb24gcmVsZWFzZUNpcmNsZSgpe1xyXG4gICAgc2V0QWN0aXZlQ2lyY2xlKG51bGwpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1vdmVDdXJzb3IgPSBmdW5jdGlvbiBtb3ZlQ3Vyc29yKHgseSl7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XHJcbiAgICBpZihzdGF0ZS5hY3RpdmVDaXJjbGUgPT09IG51bGwpIHJldHVybjsgLy8gbm8gY2lyY2xlIHNlbGVjdGVkLlxyXG5cclxuICAgIGNvbnN0IGRYID0geCAtIHN0YXRlLmxhc3RYWS54LFxyXG4gICAgICAgICAgZFkgPSB5IC0gc3RhdGUubGFzdFhZLnk7XHJcbiAgICBtb3ZlQ2lyY2xlKHN0YXRlLmFjdGl2ZUNpcmNsZSxkWCxkWSk7XHJcbiAgICBzYXZlQ3Vyc29yQ29vcmRpbmF0ZSh7eCx5fSk7XHJcbn07XHJcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFV0aWxpdHlcclxuXHJcbmZ1bmN0aW9uIHJhbmRCZXR3ZWVuKG1pbixtYXgpe1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoobWF4LW1pbisxKSkrbWluO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXN0YW5jZShjQSxjQil7XHJcbiAgICB2YXIgaSwgZD0gMC4wO1xyXG4gICAgZm9yKGkgaW4gY0Epe1xyXG4gICAgICAgIHZhciBkZWx0YSA9IGNBW2ldLWNCW2ldO1xyXG4gICAgICAgIGQgKz0gZGVsdGEqZGVsdGE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGQpO1xyXG59XHJcblxyXG5leHBvcnQge2Rpc3RhbmNlfTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFByb3hpbWl0eSBEZXRlY3Rpb25cclxuXHJcbmZ1bmN0aW9uIGNhbkluc2VydChhcnIsY29vcmRpbmF0ZSxwcm94aW1pdHkpe1xyXG4gICAgdmFyIHJlZHVjZWQgPSBhcnIuZmlsdGVyKCBjID0+IHtcclxuXHJcbiAgICAgICAgdmFyIGk7XHJcbiAgICAgICAgZm9yKGkgaW4gYyl7XHJcbiAgICAgICAgICAgIGlmKE1hdGguYWJzKCBjW2ldIC0gY29vcmRpbmF0ZVtpXSApID4gcHJveGltaXR5KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKHJlZHVjZWQpO1xyXG5cclxuICAgIHJldHVybiAhcmVkdWNlZC5zb21lKCBjID0+IChkaXN0YW5jZShjLGNvb3JkaW5hdGUpIDwgcHJveGltaXR5KSk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENvb3JkaW5hdGVzXHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNvb3JkaW5hdGVzKHtjb3VudCxyYWRpdXMsY2FudmFzSGVpZ2h0LGNhbnZhc1dpZHRofSl7XHJcbiAgICB2YXIgYXJyID0gW10sIGksIHIgPSByYWRpdXMsIHJldHJpZXMgPSAwO1xyXG5cclxuICAgIGZvcihpPTA7aTxjb3VudDtpKyspe1xyXG4gICAgICAgIHZhciBjID0ge1xyXG4gICAgICAgICAgICB4OnJhbmRCZXR3ZWVuKHIsY2FudmFzV2lkdGgtciksXHJcbiAgICAgICAgICAgIHk6cmFuZEJldHdlZW4ocixjYW52YXNIZWlnaHQtcilcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZighY2FuSW5zZXJ0KGFycixjLDIqcikpe1xyXG4gICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgIGlmKHJldHJpZXMrKyA+IDEwMDApIHJldHVybiBudWxsOyAvLyBuZWVkIHNtYWxsZXIgcmFkaXVzLlxyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFyci5wdXNoKGMpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnI7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENvbG9yc1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDb2xvcnMoe2NvdW50fSl7XHJcbiAgICB2YXIgYXJyID0gW10saSxyZXRyaWVzID0gMCxjb2xvckRpdmVyc2l0eSA9IDIwMDtcclxuICAgIGZvcihpPTA7aTxjb3VudDtpKyspe1xyXG4gICAgICAgIHZhciBjb2xvciA9IHtcclxuICAgICAgICAgICAgcjpyYW5kQmV0d2VlbigwLDI1NSksXHJcbiAgICAgICAgICAgIGc6cmFuZEJldHdlZW4oMCwyNTUpLFxyXG4gICAgICAgICAgICBiOnJhbmRCZXR3ZWVuKDAsMjU1KVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmKCFjYW5JbnNlcnQoYXJyLGNvbG9yLGNvbG9yRGl2ZXJzaXR5KSl7XHJcbiAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgaWYocmV0cmllcysrID4gMTAwMCl7XHJcbiAgICAgICAgICAgICAgICBjb2xvckRpdmVyc2l0eSAvPSAyO1xyXG4gICAgICAgICAgICAgICAgcmV0cmllcyA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcnIucHVzaChjb2xvcik7XHJcbiAgICAgICAgcmV0cmllcyA9IDA7IC8vIHJlc2V0IHJldHJpZXMuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXJyO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDaXJjbGVzXHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNpcmNsZXMoe2NvdW50LGNhbnZhc0hlaWdodCxjYW52YXNXaWR0aH0pe1xyXG4gICAgdmFyIGFyciA9IFtdLCBpO1xyXG5cclxuICAgIHZhciByID0gNTAsIGNvbG9yO1xyXG5cclxuICAgIHZhciBjb29yZHM7XHJcbiAgICB3aGlsZSggIShjb29yZHMgPSBnZW5lcmF0ZUNvb3JkaW5hdGVzKHtjb3VudDpjb3VudCxyYWRpdXM6cixjYW52YXNIZWlnaHQsY2FudmFzV2lkdGh9KSkgKXtcclxuICAgICAgICByLT01O1xyXG4gICAgICAgIGlmKHIgPT09IDApIHRocm93IFwiVG9vIG1hbnkgY2lyY2xlc1wiO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IGdlbmVyYXRlQ29sb3JzKHtjb3VudDpjb3VudH0pO1xyXG5cclxuICAgIGZvciggaSA9IDA7IGkgPCBjb3VudDsgaSsrICl7XHJcblxyXG4gICAgICAgIGNvbG9yID0gXCJyZ2IoXCIrIFtjb2xvcnNbaV0uciwgY29sb3JzW2ldLmcsIGNvbG9yc1tpXS5iXS5qb2luKCcsJykrIFwiKVwiO1xyXG5cclxuICAgICAgICBhcnIucHVzaCh7XHJcbiAgICAgICAgICAgIGlkOmksXHJcbiAgICAgICAgICAgIGN4OmNvb3Jkc1tpXS54LFxyXG4gICAgICAgICAgICBjeTpjb29yZHNbaV0ueSxcclxuICAgICAgICAgICAgcixcclxuICAgICAgICAgICAgY29sb3JcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgcmV0dXJuIGFycjtcclxufVxyXG5cclxuZXhwb3J0IHtnZW5lcmF0ZUNpcmNsZXN9O1xyXG4iLCIvKiBpbmRleC5qcyAqL1xyXG5cclxuLy8gVGhpcyB3aWxsIGFsc28gY29udGFpbiBtdWNoIG9mIHRoZSBcInZpZXdcIiBwYXJ0IG9mIGFuIE1WQyBhcmNoaXRlY3R1cmUuXHJcbmltcG9ydCB7XHJcbiAgICBjbGVhcixcclxuICAgIGRyYXdDaXJjbGVzLFxyXG4gICAgZHJhd0JlemllckN1cnZlRnJvbUFUb0JcclxufSBmcm9tICcuL3JlbmRlcic7XHJcblxyXG5pbXBvcnQge1xyXG4gICAgZ2V0U3RhdGUsXHJcbiAgICBzZXRDYW52YXNEaW1lbnNpb25zLFxyXG4gICAgc2V0TnVtYmVyT2ZDaXJjbGVzLFxyXG4gICAgYWRkQ2hhbmdlTGlzdGVuZXJcclxufSBmcm9tICcuL3N0b3JlJztcclxuXHJcbmltcG9ydCB7XHJcbiAgICBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUsXHJcbiAgICByZWxlYXNlQ2lyY2xlLFxyXG4gICAgbW92ZUN1cnNvclxyXG59IGZyb20gJy4vY29udHJvbGxlcic7XHJcblxyXG5leHBvcnQgY29uc3QgSU5QVVRfSUQgPSBcIm5DaXJjbGVzXCI7XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBIZWxwZXJcclxuXHJcbmZ1bmN0aW9uIGdldENhbnZhcygpe1xyXG4gICAgcmV0dXJuIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibXlDYW52YXNcIik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEN1cnNvclBvc2l0aW9uKGNhbnZhcywgZXZlbnQpIHtcclxuICAgIHZhciByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgdmFyIHggPSBldmVudC5jbGllbnRYIC0gcmVjdC5sZWZ0O1xyXG4gICAgdmFyIHkgPSBldmVudC5jbGllbnRZIC0gcmVjdC50b3A7XHJcbiAgICByZXR1cm4ge3gseX07XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFVwZGF0ZSAvIFJlbmRlclxyXG5cclxudmFyIG1vdmluZ0FDaXJjbGUgPSBmYWxzZTtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZSgpe1xyXG4gICAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xyXG5cclxuICAgIC8vIE51bWJlciBvZiBDaXJjbGVzIGlucHV0XHJcbiAgICB2YXIgaW5wdXRFbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJTlBVVF9JRCk7XHJcbiAgICBpbnB1dEVsbS5kZWZhdWx0VmFsdWUgPSBzdGF0ZS5udW1iZXJPZkNpcmNsZXM7XHJcblxyXG4gICAgLy8gQ29vcmRpbmF0ZSBEaXNwbGF5XHJcbiAgICB2YXIgY29vcmRpbmF0ZUVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2lyY2xlLWNvb3JkaW5hdGVzXCIpO1xyXG4gICAgdmFyIGNpcmNsZSA9IHN0YXRlLmNpcmNsZXNbc3RhdGUuYWN0aXZlQ2lyY2xlXTtcclxuICAgIGNvb3JkaW5hdGVFbG0uaW5uZXJIVE1MID0gY2lyY2xlID8gKFwiKFwiICsgY2lyY2xlLmN4ICsgXCIsXCIgKyBjaXJjbGUuY3kgKyBcIilcIikgOiBcIlwiO1xyXG5cclxuICAgIC8vIENBTlZBU1xyXG5cclxuICAgIHZhciBmb3JlZ3JvdW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215Q2FudmFzJykuZ2V0Q29udGV4dCgnMmQnKTtcclxuICAgIHZhciBiYWNrZ3JvdW5kID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ215QmFja2dyb3VuZENhbnZhcycpLmdldENvbnRleHQoJzJkJyk7XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhd1RoZUJlemllckN1cnZlKGNvbnRleHQpe1xyXG4gICAgICAgIGlmKHN0YXRlLm51bWJlck9mQ2lyY2xlcyA8IDIpIHJldHVybjsgLy8gY2FuJ3QgZHJhdyB0aGUgY3VydmUuLi5cclxuICAgICAgICBkcmF3QmV6aWVyQ3VydmVGcm9tQVRvQihcclxuICAgICAgICAgICAgY29udGV4dCxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgeDpzdGF0ZS5jaXJjbGVzWzBdLmN4LFxyXG4gICAgICAgICAgICAgICAgeTpzdGF0ZS5jaXJjbGVzWzBdLmN5XHJcbiAgICAgICAgICAgIH0se1xyXG4gICAgICAgICAgICAgICAgeDpzdGF0ZS5jaXJjbGVzWzFdLmN4LFxyXG4gICAgICAgICAgICAgICAgeTpzdGF0ZS5jaXJjbGVzWzFdLmN5XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXRlLmNpcmNsZXNbMF0uclxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSSB3aWxsIGJlIG1vdmluZyBhIGNpcmNsZS4gIFJlbmRlciBub24tcmVsZXZhbnRcclxuICAgIC8vIGl0ZW1zIGluIHRoZSBiYWNrZ3JvdW5kLlxyXG4gICAgaWYoIW1vdmluZ0FDaXJjbGUgJiYgc3RhdGUuYWN0aXZlQ2lyY2xlICE9PSBudWxsKXtcclxuXHJcbiAgICAgICAgY2xlYXIoYmFja2dyb3VuZCk7XHJcblxyXG4gICAgICAgIGlmKHN0YXRlLmFjdGl2ZUNpcmNsZSA8IDIpe1xyXG4gICAgICAgICAgICBkcmF3Q2lyY2xlcyhiYWNrZ3JvdW5kLHN0YXRlLmNpcmNsZXMuc2xpY2UoMikpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBkcmF3Q2lyY2xlcyhiYWNrZ3JvdW5kLHN0YXRlLmNpcmNsZXMuc2xpY2UoMCxzdGF0ZS5hY3RpdmVDaXJjbGUpLmNvbmNhdChzdGF0ZS5jaXJjbGVzLnNsaWNlKHN0YXRlLmFjdGl2ZUNpcmNsZSsxKSkpO1xyXG4gICAgICAgICAgICBkcmF3VGhlQmV6aWVyQ3VydmUoYmFja2dyb3VuZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZpbmdBQ2lyY2xlID0gdHJ1ZTtcclxuXHJcbiAgICAvLyBPbmNlIEknbSBkb25lIG1vdmluZyB0aGUgY2lyY2xlLCBjbGVhciB0aGUgYmFja2dyb3VuZC5cclxuICAgIH1lbHNlIGlmKG1vdmluZ0FDaXJjbGUgJiYgc3RhdGUuYWN0aXZlQ2lyY2xlID09PSBudWxsKXtcclxuICAgICAgICBjbGVhcihiYWNrZ3JvdW5kKTtcclxuICAgICAgICBtb3ZpbmdBQ2lyY2xlID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgaWYobW92aW5nQUNpcmNsZSl7XHJcbiAgICAgICAgY2xlYXIoZm9yZWdyb3VuZCk7XHJcbiAgICAgICAgaWYoc3RhdGUuYWN0aXZlQ2lyY2xlIDwgMil7XHJcbiAgICAgICAgICAgIGRyYXdDaXJjbGVzKGZvcmVncm91bmQsc3RhdGUuY2lyY2xlcy5zbGljZSgwLDIpKTtcclxuICAgICAgICAgICAgZHJhd1RoZUJlemllckN1cnZlKGZvcmVncm91bmQpO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICBkcmF3Q2lyY2xlcyhmb3JlZ3JvdW5kLFtzdGF0ZS5jaXJjbGVzW3N0YXRlLmFjdGl2ZUNpcmNsZV1dKTtcclxuICAgICAgICB9XHJcbiAgICB9ZWxzZXtcclxuXHJcbiAgICAgICAgY2xlYXIoZm9yZWdyb3VuZCk7XHJcbiAgICAgICAgZHJhd0NpcmNsZXMoZm9yZWdyb3VuZCwgc3RhdGUuY2lyY2xlcyApO1xyXG5cclxuICAgICAgICBpZihzdGF0ZS5udW1iZXJPZkNpcmNsZXMgPj0gMil7XHJcbiAgICAgICAgICAgIGRyYXdUaGVCZXppZXJDdXJ2ZShmb3JlZ3JvdW5kKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBFdmVudCBIYW5kbGluZ1xyXG5cclxuZnVuY3Rpb24gb25OdW1iZXJPZkNpcmNsZXNDaGFuZ2UoZSl7XHJcbiAgICB2YXIgbkNpcmNsZXMgPSBwYXJzZUludChlLnRhcmdldC52YWx1ZSkgfHwgMDtcclxuICAgIHNldE51bWJlck9mQ2lyY2xlcyhuQ2lyY2xlcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZU1vdXNlRG93bihldmVudCl7XHJcbiAgICBjb25zdCBjYW52YXMgPSBnZXRDYW52YXMoKTtcclxuICAgIGNvbnN0IGN1cnNvciA9IGdldEN1cnNvclBvc2l0aW9uKGNhbnZhcyxldmVudCk7XHJcblxyXG4gICAgb2J0YWluQ2lyY2xlQXRDb29yZGluYXRlKGN1cnNvci54LGN1cnNvci55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTW91c2VNb3ZlKGV2ZW50KXtcclxuICAgIGNvbnN0IGNhbnZhcyA9IGdldENhbnZhcygpO1xyXG4gICAgY29uc3QgY3Vyc29yID0gZ2V0Q3Vyc29yUG9zaXRpb24oY2FudmFzLGV2ZW50KTtcclxuXHJcbiAgICBtb3ZlQ3Vyc29yKGN1cnNvci54LGN1cnNvci55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTW91c2VVcCgpe1xyXG4gICAgcmVsZWFzZUNpcmNsZSgpO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBJbml0aWFsaXphdGlvblxyXG5cclxud2luZG93Lm9ubG9hZCA9ICgpPT57XHJcblxyXG4gICAgLy8gYWRqdXN0IGNhbnZhcyBkaW1pbmVuc2lvbnNcclxuICAgIHZhciBjYW52YXMgPSBnZXRDYW52YXMoKTtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMucGFyZW50Tm9kZS5vZmZzZXRIZWlnaHQ7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMucGFyZW50Tm9kZS5vZmZzZXRXaWR0aDtcclxuICAgIHZhciBiZ0NhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdteUJhY2tncm91bmRDYW52YXMnKTtcclxuICAgIGJnQ2FudmFzLmhlaWdodCA9IGNhbnZhcy5oZWlnaHQ7XHJcbiAgICBiZ0NhbnZhcy53aWR0aCA9IGNhbnZhcy53aWR0aDtcclxuXHJcbiAgICBzZXRDYW52YXNEaW1lbnNpb25zKGNhbnZhcy5oZWlnaHQsY2FudmFzLndpZHRoKTtcclxuXHJcbiAgICAvLyBhZGQgZXZlbnQgbGlzdGVuZXJzXHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLGhhbmRsZU1vdXNlRG93bik7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLGhhbmRsZU1vdXNlTW92ZSk7XHJcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIixoYW5kbGVNb3VzZVVwKTtcclxuXHJcbiAgICB2YXIgaW5wdXRFbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChJTlBVVF9JRCk7XHJcbiAgICBpbnB1dEVsbS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLG9uTnVtYmVyT2ZDaXJjbGVzQ2hhbmdlKTtcclxuXHJcbiAgICAvLyBpbml0aWFsaXplXHJcbiAgICBpbnB1dEVsbS5kZWZhdWx0VmFsdWUgPSBnZXRTdGF0ZSgpLm51bWJlck9mQ2lyY2xlcztcclxuICAgIGFkZENoYW5nZUxpc3RlbmVyKHVwZGF0ZSk7XHJcblxyXG4gICAgc2V0TnVtYmVyT2ZDaXJjbGVzKDUpO1xyXG59O1xyXG4iLCJmdW5jdGlvbiBkcmF3Q2lyY2xlKGN0eCx7Y3g9NTAsY3k9NTAscj01MCxjb2xvcj1cIiNmMDBcIn09e30pe1xyXG4gICAgY3R4LmZpbGxTdHlsZT1jb2xvcjtcclxuXHJcbiAgICAvLyBhZGQgc2hhZG93IHRvIGNpcmNsZVxyXG4gICAgY3R4LnNoYWRvd09mZnNldFkgPSA0O1xyXG4gICAgY3R4LnNoYWRvd0JsdXIgPSA0O1xyXG4gICAgY3R4LnNoYWRvd0NvbG9yID0gXCJyZ2JhKDAsMCwwLDAuNilcIjtcclxuXHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gICAgLy8gbWFpbiBjaXJjbGVcclxuICAgIGN0eC5hcmMoXHJcbiAgICAgICAgY3gsXHJcbiAgICAgICAgY3ksXHJcbiAgICAgICAgcixcclxuICAgICAgICAwLFxyXG4gICAgICAgIE1hdGguUEkgKiAyLFxyXG4gICAgICAgIHRydWVcclxuICAgICk7XHJcbiAgICBjdHguZmlsbCgpO1xyXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xyXG5cclxuICAgIC8vIHJlc2V0IHNoYWRvdyBwYXJhbWV0ZXJzXHJcbiAgICBjdHguc2hhZG93T2Zmc2V0WSA9IDA7XHJcbiAgICBjdHguc2hhZG93Qmx1ciA9IDA7XHJcbiAgICBjdHguc2hhZG93Q29sb3IgPSBcInRyYW5zcGFyZW50XCI7XHJcblxyXG4gICAgLy8gYm9yZGVyLlxyXG4gICAgY29uc3QgYm9yZGVycyA9IFt7XHJcbiAgICAgICAgb2Zmc2V0Oi0zLFxyXG4gICAgICAgIHdpZHRoOjYsXHJcbiAgICAgICAgY29sb3I6XCJibGFja1wiXHJcbiAgICB9LHtcclxuICAgICAgICBvZmZzZXQ6LTMsXHJcbiAgICAgICAgd2lkdGg6MyxcclxuICAgICAgICBjb2xvcjpcIndoaXRlXCJcclxuICAgIH1dO1xyXG5cclxuICAgIHZhciBpLGwgPSBib3JkZXJzLmxlbmd0aDtcclxuICAgIGZvcihpPTA7aTxsO2krKyl7XHJcbiAgICAgICAgY3R4LnN0cm9rZVN0eWxlID0gYm9yZGVyc1tpXS5jb2xvcjtcclxuICAgICAgICBjdHgubGluZVdpZHRoID0gYm9yZGVyc1tpXS53aWR0aDtcclxuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICAgICAgY3R4LmFyYyhcclxuICAgICAgICAgICAgY3gsXHJcbiAgICAgICAgICAgIGN5LFxyXG4gICAgICAgICAgICByICsgYm9yZGVyc1tpXS5vZmZzZXQsXHJcbiAgICAgICAgICAgIDAsXHJcbiAgICAgICAgICAgIE1hdGguUEkqMixcclxuICAgICAgICAgICAgdHJ1ZVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xyXG4gICAgICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuICAgIH1cclxuXHJcblxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhcihjb250ZXh0KXtcclxuICAgIC8vIGNsZWFyIGNhbnZhc1xyXG4gICAgY29udGV4dC5jbGVhclJlY3QoMCwwLGNvbnRleHQuY2FudmFzLndpZHRoLGNvbnRleHQuY2FudmFzLmhlaWdodCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdDaXJjbGVzKGNvbnRleHQsY2lyY2xlcyl7XHJcbiAgICAvLyBkcmF3IGNpcmNsZXNcclxuICAgIHZhciBpO1xyXG4gICAgZm9yKGk9MDtpPGNpcmNsZXMubGVuZ3RoO2krKyl7XHJcbiAgICAgICAgZHJhd0NpcmNsZShjb250ZXh0LGNpcmNsZXNbaV0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZHJhd0JlemllckN1cnZlRnJvbUFUb0IoY29udGV4dCwgcG9pbnRBLHBvaW50QixyYWRpdXMpe1xyXG4gICAgLy8gbGVmdG1vc3QgcG9pbnQgaXMgXCJzdGFydFwiLCBvdGhlciBpcyBcImVuZFwiXHJcbiAgICBsZXQgc3RhcnQgPSBwb2ludEEsXHJcbiAgICAgICAgZW5kID0gcG9pbnRCO1xyXG5cclxuICAgIGlmKHBvaW50QS54ID4gcG9pbnRCLngpe1xyXG4gICAgICAgIHN0YXJ0ID0gcG9pbnRCLCBlbmQgPSBwb2ludEE7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgdGhlIGVuZCBpcyBub3QgY29tcGxldGVseSByaWdodCBvZiB0aGUgc3RhcnQgcG9pbnQuXHJcbiAgICB2YXIgYWJvdmUgPSAoc3RhcnQueCArIHJhZGl1cyA+IGVuZC54IC0gcmFkaXVzKTtcclxuXHJcbiAgICBsZXQgc3RhcnRYID0gKGFib3ZlKSA/IChzdGFydC54IC0gcmFkaXVzKSA6IChzdGFydC54ICsgcmFkaXVzKSxcclxuICAgICAgICBzdGFydFkgPSBzdGFydC55LFxyXG4gICAgICAgIGVuZFggPSBlbmQueCAtIHJhZGl1cyxcclxuICAgICAgICBlbmRZID0gZW5kLnk7XHJcblxyXG4gICAgY29udGV4dC5zdHJva2VTdHlsZSA9IFwid2hpdGVcIjtcclxuICAgIGNvbnRleHQubGluZVdpZHRoID0gXCIzXCI7XHJcbiAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xyXG4gICAgY29udGV4dC5tb3ZlVG8oc3RhcnRYLHN0YXJ0WSk7XHJcbiAgICBpZihhYm92ZSl7XHJcbiAgICAgICAgY29udGV4dC5iZXppZXJDdXJ2ZVRvKFxyXG4gICAgICAgICAgICBzdGFydFgtMjAsXHJcbiAgICAgICAgICAgIHN0YXJ0WSxcclxuICAgICAgICAgICAgc3RhcnRYLTIwLFxyXG4gICAgICAgICAgICBlbmRZLFxyXG4gICAgICAgICAgICBlbmRYLFxyXG4gICAgICAgICAgICBlbmRZXHJcbiAgICAgICAgKTtcclxuICAgIH1lbHNle1xyXG4gICAgICAgIHZhciBoYWxmID0gKGVuZFggLSBzdGFydFgpIC8gMjtcclxuICAgICAgICBjb250ZXh0LmJlemllckN1cnZlVG8oXHJcbiAgICAgICAgICAgIHN0YXJ0WCtoYWxmLFxyXG4gICAgICAgICAgICBzdGFydFksXHJcbiAgICAgICAgICAgIGVuZFgtaGFsZixcclxuICAgICAgICAgICAgZW5kWSxcclxuICAgICAgICAgICAgZW5kWCxcclxuICAgICAgICAgICAgZW5kWVxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcbiAgICBjb250ZXh0LnN0cm9rZSgpO1xyXG4gICAgY29udGV4dC5jbG9zZVBhdGgoKTtcclxufVxyXG5cclxuZXhwb3J0IHtcclxuICAgIGNsZWFyLFxyXG4gICAgZHJhd0NpcmNsZXMsXHJcbiAgICBkcmF3QmV6aWVyQ3VydmVGcm9tQVRvQlxyXG59O1xyXG4iLCJpbXBvcnQge2dlbmVyYXRlQ2lyY2xlc30gZnJvbSAnLi9nZW5lcmF0aW9uJztcclxuXHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBTdGF0ZVxyXG5cclxubGV0IHN0YXRlID0ge1xyXG4gICAgbnVtYmVyT2ZDaXJjbGVzOjAsXHJcbiAgICBjaXJjbGVzOltdLFxyXG4gICAgYWN0aXZlQ2lyY2xlOm51bGwsXHJcbiAgICBsYXN0WFk6e3g6MCx5OjB9LFxyXG4gICAgY2FudmFzSGVpZ2h0OjAsXHJcbiAgICBjYW52YXNXaWR0aDowXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgZ2V0U3RhdGUgPSBmdW5jdGlvbiBnZXRTdGF0ZSgpe1xyXG4gICAgcmV0dXJuIHN0YXRlO1xyXG59O1xyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gQ2hhbmdlIExpc3RlbmluZyBNZWNoYW5pc21cclxuXHJcbmxldCBjaGFuZ2VMaXN0ZW5lcnMgPSBbXTtcclxuXHJcbmV4cG9ydCBjb25zdCBhZGRDaGFuZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uIGFkZENoYW5nZUxpc3RlbmVyKGNhbGxiYWNrKXtcclxuICAgIGNoYW5nZUxpc3RlbmVycy5wdXNoKGNhbGxiYWNrKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIGVtaXRDaGFuZ2UoKXtcclxuICAgIHZhciBpLCBsID0gY2hhbmdlTGlzdGVuZXJzLmxlbmd0aDtcclxuICAgIGZvcihpPTA7aTxsO2krKyl7XHJcbiAgICAgICAgY2hhbmdlTGlzdGVuZXJzW2ldKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIEFjdGlvbnNcclxuXHJcbmZ1bmN0aW9uIHJlZ2VuZXJhdGVDaXJjbGVzKCl7XHJcbiAgICBzdGF0ZS5jaXJjbGVzID0gZ2VuZXJhdGVDaXJjbGVzKHtcclxuICAgICAgICBjb3VudDogc3RhdGUubnVtYmVyT2ZDaXJjbGVzLFxyXG4gICAgICAgIGNhbnZhc1dpZHRoOiBzdGF0ZS5jYW52YXNXaWR0aCxcclxuICAgICAgICBjYW52YXNIZWlnaHQ6IHN0YXRlLmNhbnZhc0hlaWdodFxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBzZXRDYW52YXNEaW1lbnNpb25zID0gZnVuY3Rpb24gc2V0Q2FudmFzRGltZW5zaW9ucyhoZWlnaHQsd2lkdGgpe1xyXG4gICAgc3RhdGUuY2FudmFzSGVpZ2h0ID0gaGVpZ2h0O1xyXG4gICAgc3RhdGUuY2FudmFzV2lkdGggPSB3aWR0aDtcclxuICAgIHJlZ2VuZXJhdGVDaXJjbGVzKCk7XHJcbiAgICBlbWl0Q2hhbmdlKCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgc2V0TnVtYmVyT2ZDaXJjbGVzID0gZnVuY3Rpb24gc2V0TnVtYmVyT2ZDaXJjbGVzKG51bWJlck9mQ2lyY2xlcyl7XHJcbiAgICBzdGF0ZS5udW1iZXJPZkNpcmNsZXMgPSBudW1iZXJPZkNpcmNsZXM7XHJcbiAgICByZWdlbmVyYXRlQ2lyY2xlcygpO1xyXG4gICAgZW1pdENoYW5nZSgpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHNldEFjdGl2ZUNpcmNsZSA9IGZ1bmN0aW9uIHNldEFjdGl2ZUNpcmNsZShjaXJjbGVJZCl7XHJcbiAgICBpZihjaXJjbGVJZCA9PT0gdW5kZWZpbmVkKSBjaXJjbGVJZCA9IG51bGw7XHJcbiAgICBzdGF0ZS5hY3RpdmVDaXJjbGUgPSBjaXJjbGVJZDtcclxuICAgIGVtaXRDaGFuZ2UoKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBzYXZlQ3Vyc29yQ29vcmRpbmF0ZSA9IGZ1bmN0aW9uIHNhdmVDdXJzb3JDb29yZGluYXRlKGNvb3JkaW5hdGUpe1xyXG4gICAgc3RhdGUubGFzdFhZID0gY29vcmRpbmF0ZTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBtb3ZlQ2lyY2xlID0gZnVuY3Rpb24gbW92ZUNpcmNsZShjaXJjbGVJZCxkZWx0YVgsZGVsdGFZKXtcclxuICAgIHZhciBjaXJjbGUgPSBzdGF0ZS5jaXJjbGVzW2NpcmNsZUlkXTtcclxuICAgIGlmKCFjaXJjbGUpIHJldHVybjtcclxuICAgIGNpcmNsZS5jeCArPSBkZWx0YVg7XHJcbiAgICBjaXJjbGUuY3kgKz0gZGVsdGFZO1xyXG4gICAgZW1pdENoYW5nZSgpO1xyXG59O1xyXG4iXX0=
