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

function update() {
    var state = (0, _store.getState)();

    var inputElm = document.getElementById(_constants.INPUT_ID);
    inputElm.defaultValue = state.numberOfCircles;

    var coordinateElm = document.getElementById("circle-coordinates");
    var circle = state.circles[state.activeCircle];
    coordinateElm.innerHTML = circle ? "(" + circle.cx + "," + circle.cy + ")" : "";

    (0, _render.clear)();
    (0, _render.drawCircles)(state.circles);

    // also draw bezier curve between first two circles.
    if (state.numberOfCircles >= 2) {
        (0, _render.drawBezierCurveFromAToB)({
            x: state.circles[0].cx,
            y: state.circles[0].cy
        }, {
            x: state.circles[1].cx,
            y: state.circles[1].cy
        }, state.circles[0].r);
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
exports.drawBezierCurveFromAToB = exports.drawCircles = exports.clear = undefined;

var _constants = require("./constants");

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

function getContext() {

    var canvas = document.getElementById(_constants.CANVAS_ID);
    return canvas.getContext('2d');
}

function clear() {
    // get context
    var canvas = document.getElementById(_constants.CANVAS_ID);
    var context = canvas.getContext('2d');

    // clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCircles(circles) {
    var context = getContext();

    // draw circles
    var i;
    for (i = 0; i < circles.length; i++) {
        drawCircle(context, circles[i]);
    }
}

function drawBezierCurveFromAToB(pointA, pointB, radius) {
    var context = getContext();

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

},{"./constants":1}],6:[function(require,module,exports){
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
    circle.cx += deltaX;
    circle.cy += deltaY;
    emitChange();
};

},{"./generation":3}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGNvbnN0YW50cy5qcyIsInNyY1xcY29udHJvbGxlci5qcyIsInNyY1xcZ2VuZXJhdGlvbi5qcyIsInNyY1xcaW5kZXguanMiLCJzcmNcXHJlbmRlci5qcyIsInNyY1xcc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ0NPLElBQU0sZ0NBQVksVUFBbEI7QUFDQSxJQUFNLDhCQUFXLFVBQWpCOzs7Ozs7Ozs7O0FDQ1A7O0FBT0E7O0FBVkE7QUFDQTs7QUFXQSxTQUFTLHNCQUFULENBQWdDLEtBQWhDLEVBQXNDO0FBQ2xDLFFBQU0sVUFBVSx1QkFBVyxPQUFYLENBQW1CLE1BQW5CLENBQ1osYUFBSztBQUNELFlBQUcsS0FBSyxHQUFMLENBQVMsTUFBTSxDQUFOLEdBQVUsRUFBRSxFQUFyQixJQUEyQixFQUFFLENBQWhDLEVBQW1DLE9BQU8sS0FBUDtBQUNuQyxZQUFHLEtBQUssR0FBTCxDQUFTLE1BQU0sQ0FBTixHQUFVLEVBQUUsRUFBckIsSUFBMkIsRUFBRSxDQUFoQyxFQUFtQyxPQUFPLEtBQVA7QUFDbkMsZUFBTyxJQUFQO0FBQ0gsS0FMVyxDQUFoQjs7QUFTQSxRQUFNLFNBQVMsUUFBUSxNQUFSLENBQWUsYUFBSztBQUMvQixZQUFJLElBQUksMEJBQ0osRUFBQyxHQUFFLEVBQUUsRUFBTCxFQUFTLEdBQUUsRUFBRSxFQUFiLEVBREksRUFFSixLQUZJLENBQVI7QUFJQSxlQUFPLElBQUksRUFBRSxDQUFiO0FBQ0gsS0FOYyxDQUFmOztBQVFBLFdBQU8sT0FBTyxDQUFQLEtBQWEsT0FBTyxDQUFQLEVBQVUsRUFBOUI7QUFDSDs7QUFFTSxJQUFNLDhEQUEyQixTQUFTLHdCQUFULENBQWtDLENBQWxDLEVBQW9DLENBQXBDLEVBQXNDO0FBQzFFLFFBQUksV0FBVyx1QkFBdUIsRUFBQyxJQUFELEVBQUcsSUFBSCxFQUF2QixDQUFmO0FBQ0EsZ0NB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LEtBQXBCO0FBQ0E7QUFDQTtBQUNILENBTE07O0FBT0EsSUFBTSxrREFBcUIsU0FBUyxrQkFBVCxDQUE0QixlQUE1QixFQUE0QztBQUMxRSxVQUFNLGVBQU4sR0FBd0IsZUFBeEI7QUFDQTtBQUNBO0FBQ0gsQ0FKTTs7QUFNQSxJQUFNLDRDQUFrQixTQUFTLGVBQVQsQ0FBeUIsUUFBekIsRUFBa0M7QUFDN0QsVUFBTSxZQUFOLEdBQXFCLFFBQXJCO0FBQ0E7QUFDSCxDQUhNOztBQUtBLElBQU0sc0RBQXVCLFNBQVMsb0JBQVQsQ0FBOEIsVUFBOUIsRUFBeUM7QUFDekUsVUFBTSxNQUFOLEdBQWUsVUFBZjtBQUNILENBRk07O0FBSUEsSUFBTSxrQ0FBYSxTQUFTLFVBQVQsQ0FBb0IsUUFBcEIsRUFBNkIsTUFBN0IsRUFBb0MsTUFBcEMsRUFBMkM7QUFDakUsUUFBSSxTQUFTLE1BQU0sT0FBTixDQUFjLFFBQWQsQ0FBYjtBQUNBLFdBQU8sRUFBUCxJQUFhLE1BQWI7QUFDQSxXQUFPLEVBQVAsSUFBYSxNQUFiO0FBQ0E7QUFDSCxDQUxNIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxyXG5leHBvcnQgY29uc3QgQ0FOVkFTX0lEID0gXCJteUNhbnZhc1wiO1xyXG5leHBvcnQgY29uc3QgSU5QVVRfSUQgPSBcIm5DaXJjbGVzXCI7XHJcbiIsIi8qIGNvbnRyb2xsZXIuanMgKi9cclxuLy8gVGhlIEMgaW4gTVZDLiAgQmFzaWNhbGx5IGdsdWUgY29kZS5cclxuXHJcbmltcG9ydCB7XHJcbiAgICBnZXRTdGF0ZSxcclxuICAgIHNldEFjdGl2ZUNpcmNsZSxcclxuICAgIHNhdmVDdXJzb3JDb29yZGluYXRlLFxyXG4gICAgbW92ZUNpcmNsZVxyXG59IGZyb20gJy4vc3RvcmUnO1xyXG5cclxuaW1wb3J0IHtkaXN0YW5jZX0gZnJvbSAnLi9nZW5lcmF0aW9uJztcclxuXHJcbmZ1bmN0aW9uIGZpbmRDaXJjbGVBdENvb3JkaW5hdGUoY29vcmQpe1xyXG4gICAgY29uc3QgcmVkdWNlZCA9IGdldFN0YXRlKCkuY2lyY2xlcy5maWx0ZXIoXHJcbiAgICAgICAgYyA9PiB7XHJcbiAgICAgICAgICAgIGlmKE1hdGguYWJzKGNvb3JkLnggLSBjLmN4KSA+IGMucikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZihNYXRoLmFicyhjb29yZC55IC0gYy5jeSkgPiBjLnIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgKTtcclxuXHJcblxyXG4gICAgY29uc3QgY2lyY2xlID0gcmVkdWNlZC5maWx0ZXIoYyA9PiB7XHJcbiAgICAgICAgdmFyIGQgPSBkaXN0YW5jZShcclxuICAgICAgICAgICAge3g6Yy5jeCwgeTpjLmN5fSxcclxuICAgICAgICAgICAgY29vcmRcclxuICAgICAgICApO1xyXG4gICAgICAgIHJldHVybiBkIDwgYy5yO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGNpcmNsZVswXSAmJiBjaXJjbGVbMF0uaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUgPSBmdW5jdGlvbiBvYnRhaW5DaXJjbGVBdENvb3JkaW5hdGUoeCx5KXtcclxuICAgIGxldCBjaXJjbGVJZCA9IGZpbmRDaXJjbGVBdENvb3JkaW5hdGUoe3gseX0pO1xyXG4gICAgc2V0QWN0aXZlQ2lyY2xlKGNpcmNsZUlkKTtcclxuICAgIHNhdmVDdXJzb3JDb29yZGluYXRlKHt4LHl9KTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCByZWxlYXNlQ2lyY2xlID0gZnVuY3Rpb24gcmVsZWFzZUNpcmNsZSgpe1xyXG4gICAgc2V0QWN0aXZlQ2lyY2xlKG51bGwpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IG1vdmVDdXJzb3IgPSBmdW5jdGlvbiBtb3ZlQ3Vyc29yKHgseSl7XHJcbiAgICBjb25zdCBzdGF0ZSA9IGdldFN0YXRlKCk7XHJcbiAgICBpZihzdGF0ZS5hY3RpdmVDaXJjbGUgPT09IG51bGwpIHJldHVybjsgLy8gbm8gY2lyY2xlIHNlbGVjdGVkLlxyXG5cclxuICAgIGNvbnN0IGRYID0geCAtIHN0YXRlLmxhc3RYWS54LFxyXG4gICAgICAgICAgZFkgPSB5IC0gc3RhdGUubGFzdFhZLnk7XHJcbiAgICBtb3ZlQ2lyY2xlKHN0YXRlLmFjdGl2ZUNpcmNsZSxkWCxkWSk7XHJcbiAgICBzYXZlQ3Vyc29yQ29vcmRpbmF0ZSh7eCx5fSk7XHJcbn07XHJcbiIsIi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFV0aWxpdHlcclxuXHJcbmZ1bmN0aW9uIHJhbmRCZXR3ZWVuKG1pbixtYXgpe1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSoobWF4LW1pbisxKSkrbWluO1xyXG59XHJcblxyXG5mdW5jdGlvbiBkaXN0YW5jZShjQSxjQil7XHJcbiAgICB2YXIgaSwgZD0gMC4wO1xyXG4gICAgZm9yKGkgaW4gY0Epe1xyXG4gICAgICAgIHZhciBkZWx0YSA9IGNBW2ldLWNCW2ldO1xyXG4gICAgICAgIGQgKz0gZGVsdGEqZGVsdGE7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTWF0aC5zcXJ0KGQpO1xyXG59XHJcblxyXG5leHBvcnQge2Rpc3RhbmNlfTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIFByb3hpbWl0eSBEZXRlY3Rpb25cclxuXHJcbmZ1bmN0aW9uIGNhbkluc2VydChhcnIsY29vcmRpbmF0ZSxwcm94aW1pdHkpe1xyXG4gICAgdmFyIHJlZHVjZWQgPSBhcnIuZmlsdGVyKCBjID0+IHtcclxuXHJcbiAgICAgICAgdmFyIGk7XHJcbiAgICAgICAgZm9yKGkgaW4gYyl7XHJcbiAgICAgICAgICAgIGlmKE1hdGguYWJzKCBjW2ldIC0gY29vcmRpbmF0ZVtpXSApID4gcHJveGltaXR5KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSk7XHJcbiAgICAvL2NvbnNvbGUubG9nKHJlZHVjZWQpO1xyXG5cclxuICAgIHJldHVybiAhcmVkdWNlZC5zb21lKCBjID0+IChkaXN0YW5jZShjLGNvb3JkaW5hdGUpIDwgcHJveGltaXR5KSk7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENvb3JkaW5hdGVzXHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNvb3JkaW5hdGVzKHtjb3VudCxyYWRpdXMsY2FudmFzSGVpZ2h0LGNhbnZhc1dpZHRofSl7XHJcbiAgICB2YXIgYXJyID0gW10sIGksIHIgPSByYWRpdXMsIHJldHJpZXMgPSAwO1xyXG5cclxuICAgIGZvcihpPTA7aTxjb3VudDtpKyspe1xyXG4gICAgICAgIHZhciBjID0ge1xyXG4gICAgICAgICAgICB4OnJhbmRCZXR3ZWVuKHIsY2FudmFzV2lkdGgtciksXHJcbiAgICAgICAgICAgIHk6cmFuZEJldHdlZW4ocixjYW52YXNIZWlnaHQtcilcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZighY2FuSW5zZXJ0KGFycixjLDIqcikpe1xyXG4gICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgIGlmKHJldHJpZXMrKyA+IDEwMDApIHJldHVybiBudWxsOyAvLyBuZWVkIHNtYWxsZXIgcmFkaXVzLlxyXG4gICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFyci5wdXNoKGMpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBhcnI7XHJcbn1cclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENvbG9yc1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDb2xvcnMoe2NvdW50fSl7XHJcbiAgICB2YXIgYXJyID0gW10saSxyZXRyaWVzID0gMCxjb2xvckRpdmVyc2l0eSA9IDIwMDtcclxuICAgIGZvcihpPTA7aTxjb3VudDtpKyspe1xyXG4gICAgICAgIHZhciBjb2xvciA9IHtcclxuICAgICAgICAgICAgcjpyYW5kQmV0d2VlbigwLDI1NSksXHJcbiAgICAgICAgICAgIGc6cmFuZEJldHdlZW4oMCwyNTUpLFxyXG4gICAgICAgICAgICBiOnJhbmRCZXR3ZWVuKDAsMjU1KVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmKCFjYW5JbnNlcnQoYXJyLGNvbG9yLGNvbG9yRGl2ZXJzaXR5KSl7XHJcbiAgICAgICAgICAgIGktLTtcclxuICAgICAgICAgICAgaWYocmV0cmllcysrID4gMTAwMCl7XHJcbiAgICAgICAgICAgICAgICBjb2xvckRpdmVyc2l0eSAvPSAyO1xyXG4gICAgICAgICAgICAgICAgcmV0cmllcyA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcnIucHVzaChjb2xvcik7XHJcbiAgICAgICAgcmV0cmllcyA9IDA7IC8vIHJlc2V0IHJldHJpZXMuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gYXJyO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDaXJjbGVzXHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZUNpcmNsZXMoe2NvdW50LGNhbnZhc0hlaWdodCxjYW52YXNXaWR0aH0pe1xyXG4gICAgdmFyIGFyciA9IFtdLCBpO1xyXG5cclxuICAgIHZhciByID0gNTAsIGNvbG9yO1xyXG5cclxuICAgIHZhciBjb29yZHM7XHJcbiAgICB3aGlsZSggIShjb29yZHMgPSBnZW5lcmF0ZUNvb3JkaW5hdGVzKHtjb3VudDpjb3VudCxyYWRpdXM6cixjYW52YXNIZWlnaHQsY2FudmFzV2lkdGh9KSkgKXtcclxuICAgICAgICByLT01O1xyXG4gICAgICAgIGlmKHIgPT09IDApIHRocm93IFwiVG9vIG1hbnkgY2lyY2xlc1wiO1xyXG4gICAgfVxyXG4gICAgdmFyIGNvbG9ycyA9IGdlbmVyYXRlQ29sb3JzKHtjb3VudDpjb3VudH0pO1xyXG5cclxuICAgIGZvciggaSA9IDA7IGkgPCBjb3VudDsgaSsrICl7XHJcblxyXG4gICAgICAgIGNvbG9yID0gXCJyZ2IoXCIrIFtjb2xvcnNbaV0uciwgY29sb3JzW2ldLmcsIGNvbG9yc1tpXS5iXS5qb2luKCcsJykrIFwiKVwiO1xyXG5cclxuICAgICAgICBhcnIucHVzaCh7XHJcbiAgICAgICAgICAgIGlkOmksXHJcbiAgICAgICAgICAgIGN4OmNvb3Jkc1tpXS54LFxyXG4gICAgICAgICAgICBjeTpjb29yZHNbaV0ueSxcclxuICAgICAgICAgICAgcixcclxuICAgICAgICAgICAgY29sb3JcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgcmV0dXJuIGFycjtcclxufVxyXG5cclxuZXhwb3J0IHtnZW5lcmF0ZUNpcmNsZXN9O1xyXG4iLCIvKiBpbmRleC5qcyAqL1xyXG5cclxuLy8gVGhpcyB3aWxsIGFsc28gY29udGFpbiBtdWNoIG9mIHRoZSBcInZpZXdcIiBwYXJ0IG9mIGFuIE1WQyBhcmNoaXRlY3R1cmUuXHJcblxyXG5pbXBvcnQge0NBTlZBU19JRCxJTlBVVF9JRH0gZnJvbSAnLi9jb25zdGFudHMnO1xyXG5pbXBvcnQge1xyXG4gICAgY2xlYXIsXHJcbiAgICBkcmF3Q2lyY2xlcyxcclxuICAgIGRyYXdCZXppZXJDdXJ2ZUZyb21BVG9CXHJcbn0gZnJvbSAnLi9yZW5kZXInO1xyXG5cclxuaW1wb3J0IHtcclxuICAgIGdldFN0YXRlLFxyXG4gICAgc2V0Q2FudmFzRGltZW5zaW9ucyxcclxuICAgIHNldE51bWJlck9mQ2lyY2xlcyxcclxuICAgIGFkZENoYW5nZUxpc3RlbmVyXHJcbn0gZnJvbSAnLi9zdG9yZSc7XHJcblxyXG5pbXBvcnQge1xyXG4gICAgb2J0YWluQ2lyY2xlQXRDb29yZGluYXRlLFxyXG4gICAgcmVsZWFzZUNpcmNsZSxcclxuICAgIG1vdmVDdXJzb3JcclxufSBmcm9tICcuL2NvbnRyb2xsZXInO1xyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gSGVscGVyXHJcblxyXG5mdW5jdGlvbiBnZXRDYW52YXMoKXtcclxuICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChDQU5WQVNfSUQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDdXJzb3JQb3NpdGlvbihjYW52YXMsIGV2ZW50KSB7XHJcbiAgICB2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIHZhciB4ID0gZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdDtcclxuICAgIHZhciB5ID0gZXZlbnQuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgcmV0dXJuIHt4LHl9O1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBVcGRhdGUgLyBSZW5kZXJcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZSgpe1xyXG4gICAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xyXG5cclxuICAgIHZhciBpbnB1dEVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElOUFVUX0lEKTtcclxuICAgIGlucHV0RWxtLmRlZmF1bHRWYWx1ZSA9IHN0YXRlLm51bWJlck9mQ2lyY2xlcztcclxuXHJcbiAgICB2YXIgY29vcmRpbmF0ZUVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2lyY2xlLWNvb3JkaW5hdGVzXCIpO1xyXG4gICAgdmFyIGNpcmNsZSA9IHN0YXRlLmNpcmNsZXNbc3RhdGUuYWN0aXZlQ2lyY2xlXTtcclxuICAgIGNvb3JkaW5hdGVFbG0uaW5uZXJIVE1MID0gY2lyY2xlID8gKFwiKFwiICsgY2lyY2xlLmN4ICsgXCIsXCIgKyBjaXJjbGUuY3kgKyBcIilcIikgOiBcIlwiO1xyXG5cclxuXHJcbiAgICBjbGVhcigpO1xyXG4gICAgZHJhd0NpcmNsZXMoIHN0YXRlLmNpcmNsZXMgKTtcclxuXHJcbiAgICAvLyBhbHNvIGRyYXcgYmV6aWVyIGN1cnZlIGJldHdlZW4gZmlyc3QgdHdvIGNpcmNsZXMuXHJcbiAgICBpZihzdGF0ZS5udW1iZXJPZkNpcmNsZXMgPj0gMil7XHJcbiAgICAgICAgZHJhd0JlemllckN1cnZlRnJvbUFUb0Ioe1xyXG4gICAgICAgICAgICB4OnN0YXRlLmNpcmNsZXNbMF0uY3gsXHJcbiAgICAgICAgICAgIHk6c3RhdGUuY2lyY2xlc1swXS5jeVxyXG4gICAgICAgIH0se1xyXG4gICAgICAgICAgICB4OnN0YXRlLmNpcmNsZXNbMV0uY3gsXHJcbiAgICAgICAgICAgIHk6c3RhdGUuY2lyY2xlc1sxXS5jeVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXRlLmNpcmNsZXNbMF0uclxyXG4gICAgICAgICk7XHJcbiAgICB9XHJcblxyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBFdmVudCBIYW5kbGluZ1xyXG5cclxuZnVuY3Rpb24gb25OdW1iZXJPZkNpcmNsZXNDaGFuZ2UoZSl7XHJcbiAgICB2YXIgbkNpcmNsZXMgPSBwYXJzZUludChlLnRhcmdldC52YWx1ZSkgfHwgMDtcclxuICAgIHNldE51bWJlck9mQ2lyY2xlcyhuQ2lyY2xlcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZU1vdXNlRG93bihldmVudCl7XHJcbiAgICBjb25zdCBjYW52YXMgPSBnZXRDYW52YXMoKTtcclxuICAgIGNvbnN0IGN1cnNvciA9IGdldEN1cnNvclBvc2l0aW9uKGNhbnZhcyxldmVudCk7XHJcblxyXG4gICAgb2J0YWluQ2lyY2xlQXRDb29yZGluYXRlKGN1cnNvci54LGN1cnNvci55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTW91c2VNb3ZlKGV2ZW50KXtcclxuICAgIGNvbnN0IGNhbnZhcyA9IGdldENhbnZhcygpO1xyXG4gICAgY29uc3QgY3Vyc29yID0gZ2V0Q3Vyc29yUG9zaXRpb24oY2FudmFzLGV2ZW50KTtcclxuXHJcbiAgICBtb3ZlQ3Vyc29yKGN1cnNvci54LGN1cnNvci55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTW91c2VVcCgpe1xyXG4gICAgcmVsZWFzZUNpcmNsZSgpO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBJbml0aWFsaXphdGlvblxyXG5cclxud2luZG93Lm9ubG9hZCA9ICgpPT57XHJcblxyXG4gICAgLy8gYWRqdXN0IGNhbnZhcyBkaW1pbmVuc2lvbnNcclxuICAgIHZhciBjYW52YXMgPSBnZXRDYW52YXMoKTtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMucGFyZW50Tm9kZS5vZmZzZXRIZWlnaHQ7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMucGFyZW50Tm9kZS5vZmZzZXRXaWR0aDtcclxuICAgIHNldENhbnZhc0RpbWVuc2lvbnMoY2FudmFzLmhlaWdodCxjYW52YXMud2lkdGgpO1xyXG5cclxuICAgIC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsaGFuZGxlTW91c2VEb3duKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsaGFuZGxlTW91c2VNb3ZlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLGhhbmRsZU1vdXNlVXApO1xyXG5cclxuICAgIHZhciBpbnB1dEVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElOUFVUX0lEKTtcclxuICAgIGlucHV0RWxtLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsb25OdW1iZXJPZkNpcmNsZXNDaGFuZ2UpO1xyXG5cclxuICAgIC8vIGluaXRpYWxpemVcclxuICAgIGlucHV0RWxtLmRlZmF1bHRWYWx1ZSA9IGdldFN0YXRlKCkubnVtYmVyT2ZDaXJjbGVzO1xyXG4gICAgYWRkQ2hhbmdlTGlzdGVuZXIodXBkYXRlKTtcclxuXHJcbiAgICBzZXROdW1iZXJPZkNpcmNsZXMoNSk7XHJcbn07XHJcbiIsIlxyXG5pbXBvcnQge0NBTlZBU19JRH0gZnJvbSAnLi9jb25zdGFudHMnO1xyXG5cclxuZnVuY3Rpb24gZHJhd0NpcmNsZShjdHgse2N4PTUwLGN5PTUwLHI9NTAsY29sb3I9XCIjZjAwXCJ9PXt9KXtcclxuICAgIGN0eC5maWxsU3R5bGU9Y29sb3I7XHJcblxyXG4gICAgLy8gYWRkIHNoYWRvdyB0byBjaXJjbGVcclxuICAgIGN0eC5zaGFkb3dPZmZzZXRZID0gNDtcclxuICAgIGN0eC5zaGFkb3dCbHVyID0gNDtcclxuICAgIGN0eC5zaGFkb3dDb2xvciA9IFwicmdiYSgwLDAsMCwwLjYpXCI7XHJcblxyXG4gICAgY3R4LmJlZ2luUGF0aCgpO1xyXG5cclxuICAgIC8vIG1haW4gY2lyY2xlXHJcbiAgICBjdHguYXJjKFxyXG4gICAgICAgIGN4LFxyXG4gICAgICAgIGN5LFxyXG4gICAgICAgIHIsXHJcbiAgICAgICAgMCxcclxuICAgICAgICBNYXRoLlBJICogMixcclxuICAgICAgICB0cnVlXHJcbiAgICApO1xyXG4gICAgY3R4LmZpbGwoKTtcclxuICAgIGN0eC5jbG9zZVBhdGgoKTtcclxuXHJcbiAgICAvLyByZXNldCBzaGFkb3cgcGFyYW1ldGVyc1xyXG4gICAgY3R4LnNoYWRvd09mZnNldFkgPSAwO1xyXG4gICAgY3R4LnNoYWRvd0JsdXIgPSAwO1xyXG4gICAgY3R4LnNoYWRvd0NvbG9yID0gXCJ0cmFuc3BhcmVudFwiO1xyXG5cclxuICAgIC8vIGJvcmRlci5cclxuICAgIGNvbnN0IGJvcmRlcnMgPSBbe1xyXG4gICAgICAgIG9mZnNldDotMyxcclxuICAgICAgICB3aWR0aDo2LFxyXG4gICAgICAgIGNvbG9yOlwiYmxhY2tcIlxyXG4gICAgfSx7XHJcbiAgICAgICAgb2Zmc2V0Oi0zLFxyXG4gICAgICAgIHdpZHRoOjMsXHJcbiAgICAgICAgY29sb3I6XCJ3aGl0ZVwiXHJcbiAgICB9XTtcclxuXHJcbiAgICB2YXIgaSxsID0gYm9yZGVycy5sZW5ndGg7XHJcbiAgICBmb3IoaT0wO2k8bDtpKyspe1xyXG4gICAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGJvcmRlcnNbaV0uY29sb3I7XHJcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IGJvcmRlcnNbaV0ud2lkdGg7XHJcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xyXG4gICAgICAgIGN0eC5hcmMoXHJcbiAgICAgICAgICAgIGN4LFxyXG4gICAgICAgICAgICBjeSxcclxuICAgICAgICAgICAgciArIGJvcmRlcnNbaV0ub2Zmc2V0LFxyXG4gICAgICAgICAgICAwLFxyXG4gICAgICAgICAgICBNYXRoLlBJKjIsXHJcbiAgICAgICAgICAgIHRydWVcclxuICAgICAgICApO1xyXG4gICAgICAgIGN0eC5zdHJva2UoKTtcclxuICAgICAgICBjdHguY2xvc2VQYXRoKCk7XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5cclxuZnVuY3Rpb24gZ2V0Q29udGV4dCgpe1xyXG5cclxuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChDQU5WQVNfSUQpO1xyXG4gICAgcmV0dXJuIGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhcigpe1xyXG4gICAgLy8gZ2V0IGNvbnRleHRcclxuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChDQU5WQVNfSUQpO1xyXG4gICAgdmFyIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcclxuXHJcbiAgICAvLyBjbGVhciBjYW52YXNcclxuICAgIGNvbnRleHQuY2xlYXJSZWN0KDAsMCxjYW52YXMud2lkdGgsY2FudmFzLmhlaWdodCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRyYXdDaXJjbGVzKGNpcmNsZXMpe1xyXG4gICAgdmFyIGNvbnRleHQgPSBnZXRDb250ZXh0KCk7XHJcblxyXG4gICAgLy8gZHJhdyBjaXJjbGVzXHJcbiAgICB2YXIgaTtcclxuICAgIGZvcihpPTA7aTxjaXJjbGVzLmxlbmd0aDtpKyspe1xyXG4gICAgICAgIGRyYXdDaXJjbGUoY29udGV4dCxjaXJjbGVzW2ldKTtcclxuICAgIH1cclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGRyYXdCZXppZXJDdXJ2ZUZyb21BVG9CKHBvaW50QSxwb2ludEIscmFkaXVzKXtcclxuICAgIHZhciBjb250ZXh0ID0gZ2V0Q29udGV4dCgpO1xyXG5cclxuICAgIC8vIGxlZnRtb3N0IHBvaW50IGlzIFwic3RhcnRcIiwgb3RoZXIgaXMgXCJlbmRcIlxyXG4gICAgbGV0IHN0YXJ0ID0gcG9pbnRBLFxyXG4gICAgICAgIGVuZCA9IHBvaW50QjtcclxuXHJcbiAgICBpZihwb2ludEEueCA+IHBvaW50Qi54KXtcclxuICAgICAgICBzdGFydCA9IHBvaW50QiwgZW5kID0gcG9pbnRBO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGlmIHRoZSBlbmQgaXMgbm90IGNvbXBsZXRlbHkgcmlnaHQgb2YgdGhlIHN0YXJ0IHBvaW50LlxyXG4gICAgdmFyIGFib3ZlID0gKHN0YXJ0LnggKyByYWRpdXMgPiBlbmQueCAtIHJhZGl1cyk7XHJcblxyXG4gICAgbGV0IHN0YXJ0WCA9IChhYm92ZSkgPyAoc3RhcnQueCAtIHJhZGl1cykgOiAoc3RhcnQueCArIHJhZGl1cyksXHJcbiAgICAgICAgc3RhcnRZID0gc3RhcnQueSxcclxuICAgICAgICBlbmRYID0gZW5kLnggLSByYWRpdXMsXHJcbiAgICAgICAgZW5kWSA9IGVuZC55O1xyXG5cclxuICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBcIndoaXRlXCI7XHJcbiAgICBjb250ZXh0LmxpbmVXaWR0aCA9IFwiM1wiO1xyXG4gICAgY29udGV4dC5iZWdpblBhdGgoKTtcclxuICAgIGNvbnRleHQubW92ZVRvKHN0YXJ0WCxzdGFydFkpO1xyXG4gICAgaWYoYWJvdmUpe1xyXG4gICAgICAgIGNvbnRleHQuYmV6aWVyQ3VydmVUbyhcclxuICAgICAgICAgICAgc3RhcnRYLTIwLFxyXG4gICAgICAgICAgICBzdGFydFksXHJcbiAgICAgICAgICAgIHN0YXJ0WC0yMCxcclxuICAgICAgICAgICAgZW5kWSxcclxuICAgICAgICAgICAgZW5kWCxcclxuICAgICAgICAgICAgZW5kWVxyXG4gICAgICAgICk7XHJcbiAgICB9ZWxzZXtcclxuICAgICAgICB2YXIgaGFsZiA9IChlbmRYIC0gc3RhcnRYKSAvIDI7XHJcbiAgICAgICAgY29udGV4dC5iZXppZXJDdXJ2ZVRvKFxyXG4gICAgICAgICAgICBzdGFydFgraGFsZixcclxuICAgICAgICAgICAgc3RhcnRZLFxyXG4gICAgICAgICAgICBlbmRYLWhhbGYsXHJcbiAgICAgICAgICAgIGVuZFksXHJcbiAgICAgICAgICAgIGVuZFgsXHJcbiAgICAgICAgICAgIGVuZFlcclxuICAgICAgICApO1xyXG4gICAgfVxyXG4gICAgY29udGV4dC5zdHJva2UoKTtcclxuICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XHJcbn1cclxuXHJcbmV4cG9ydCB7XHJcbiAgICBjbGVhcixcclxuICAgIGRyYXdDaXJjbGVzLFxyXG4gICAgZHJhd0JlemllckN1cnZlRnJvbUFUb0JcclxufTtcclxuIiwiaW1wb3J0IHtnZW5lcmF0ZUNpcmNsZXN9IGZyb20gJy4vZ2VuZXJhdGlvbic7XHJcblxyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gU3RhdGVcclxuXHJcbmxldCBzdGF0ZSA9IHtcclxuICAgIG51bWJlck9mQ2lyY2xlczowLFxyXG4gICAgY2lyY2xlczpbXSxcclxuICAgIGFjdGl2ZUNpcmNsZTpudWxsLFxyXG4gICAgbGFzdFhZOnt4OjAseTowfSxcclxuICAgIGNhbnZhc0hlaWdodDowLFxyXG4gICAgY2FudmFzV2lkdGg6MFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldFN0YXRlID0gZnVuY3Rpb24gZ2V0U3RhdGUoKXtcclxuICAgIHJldHVybiBzdGF0ZTtcclxufTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENoYW5nZSBMaXN0ZW5pbmcgTWVjaGFuaXNtXHJcblxyXG5sZXQgY2hhbmdlTGlzdGVuZXJzID0gW107XHJcblxyXG5leHBvcnQgY29uc3QgYWRkQ2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRDaGFuZ2VMaXN0ZW5lcihjYWxsYmFjayl7XHJcbiAgICBjaGFuZ2VMaXN0ZW5lcnMucHVzaChjYWxsYmFjayk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBlbWl0Q2hhbmdlKCl7XHJcbiAgICB2YXIgaSwgbCA9IGNoYW5nZUxpc3RlbmVycy5sZW5ndGg7XHJcbiAgICBmb3IoaT0wO2k8bDtpKyspe1xyXG4gICAgICAgIGNoYW5nZUxpc3RlbmVyc1tpXSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBBY3Rpb25zXHJcblxyXG5mdW5jdGlvbiByZWdlbmVyYXRlQ2lyY2xlcygpe1xyXG4gICAgc3RhdGUuY2lyY2xlcyA9IGdlbmVyYXRlQ2lyY2xlcyh7XHJcbiAgICAgICAgY291bnQ6IHN0YXRlLm51bWJlck9mQ2lyY2xlcyxcclxuICAgICAgICBjYW52YXNXaWR0aDogc3RhdGUuY2FudmFzV2lkdGgsXHJcbiAgICAgICAgY2FudmFzSGVpZ2h0OiBzdGF0ZS5jYW52YXNIZWlnaHRcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3Qgc2V0Q2FudmFzRGltZW5zaW9ucyA9IGZ1bmN0aW9uIHNldENhbnZhc0RpbWVuc2lvbnMoaGVpZ2h0LHdpZHRoKXtcclxuICAgIHN0YXRlLmNhbnZhc0hlaWdodCA9IGhlaWdodDtcclxuICAgIHN0YXRlLmNhbnZhc1dpZHRoID0gd2lkdGg7XHJcbiAgICByZWdlbmVyYXRlQ2lyY2xlcygpO1xyXG4gICAgZW1pdENoYW5nZSgpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHNldE51bWJlck9mQ2lyY2xlcyA9IGZ1bmN0aW9uIHNldE51bWJlck9mQ2lyY2xlcyhudW1iZXJPZkNpcmNsZXMpe1xyXG4gICAgc3RhdGUubnVtYmVyT2ZDaXJjbGVzID0gbnVtYmVyT2ZDaXJjbGVzO1xyXG4gICAgcmVnZW5lcmF0ZUNpcmNsZXMoKTtcclxuICAgIGVtaXRDaGFuZ2UoKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBzZXRBY3RpdmVDaXJjbGUgPSBmdW5jdGlvbiBzZXRBY3RpdmVDaXJjbGUoY2lyY2xlSWQpe1xyXG4gICAgc3RhdGUuYWN0aXZlQ2lyY2xlID0gY2lyY2xlSWQ7XHJcbiAgICBlbWl0Q2hhbmdlKCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgc2F2ZUN1cnNvckNvb3JkaW5hdGUgPSBmdW5jdGlvbiBzYXZlQ3Vyc29yQ29vcmRpbmF0ZShjb29yZGluYXRlKXtcclxuICAgIHN0YXRlLmxhc3RYWSA9IGNvb3JkaW5hdGU7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgbW92ZUNpcmNsZSA9IGZ1bmN0aW9uIG1vdmVDaXJjbGUoY2lyY2xlSWQsZGVsdGFYLGRlbHRhWSl7XHJcbiAgICB2YXIgY2lyY2xlID0gc3RhdGUuY2lyY2xlc1tjaXJjbGVJZF07XHJcbiAgICBjaXJjbGUuY3ggKz0gZGVsdGFYO1xyXG4gICAgY2lyY2xlLmN5ICs9IGRlbHRhWTtcclxuICAgIGVtaXRDaGFuZ2UoKTtcclxufTtcclxuIl19
