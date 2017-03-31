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

    (0, _render.drawCircles)(state.circles);
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
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.drawCircles = undefined;

var _constants = require('./constants');

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
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
    ctx.fill();
}

function drawCircles(circles) {
    // get context
    var canvas = document.getElementById(_constants.CANVAS_ID);
    var context = canvas.getContext('2d');

    // clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // draw circles
    var i;
    for (i = 0; i < circles.length; i++) {
        drawCircle(context, circles[i]);
    }
}

exports.drawCircles = drawCircles;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmNcXGNvbnN0YW50cy5qcyIsInNyY1xcY29udHJvbGxlci5qcyIsInNyY1xcZ2VuZXJhdGlvbi5qcyIsInNyY1xcaW5kZXguanMiLCJzcmNcXHJlbmRlci5qcyIsInNyY1xcc3RvcmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ0NPLElBQU0sZ0NBQVksVUFBbEI7QUFDQSxJQUFNLDhCQUFXLFVBQWpCOzs7Ozs7Ozs7O0FDQ1A7O0FBT0E7O0FBVkE7QUFDQTs7QUFXQSxTQUFTLHNCQUFULENBQWdDLEtBQWhDLEVBQXNDO0FBQ2xDLFFBQU0sVUFBVSx1QkFBVyxPQUFYLENBQW1CLE1BQW5CLENBQ1osYUFBSztBQUNELFlBQUcsS0FBSyxHQUFMLENBQVMsTUFBTSxDQUFOLEdBQVUsRUFBRSxFQUFyQixJQUEyQixFQUFFLENBQWhDLEVBQW1DLE9BQU8sS0FBUDtBQUNuQyxZQUFHLEtBQUssR0FBTCxDQUFTLE1BQU0sQ0FBTixHQUFVLEVBQUUsRUFBckIsSUFBMkIsRUFBRSxDQUFoQyxFQUFtQyxPQUFPLEtBQVA7QUFDbkMsZUFBTyxJQUFQO0FBQ0gsS0FMVyxDQUFoQjs7QUFTQSxRQUFNLFNBQVMsUUFBUSxNQUFSLENBQWUsYUFBSztBQUMvQixZQUFJLElBQUksMEJBQ0osRUFBQyxHQUFFLEVBQUUsRUFBTCxFQUFTLEdBQUUsRUFBRSxFQUFiLEVBREksRUFFSixLQUZJLENBQVI7QUFJQSxlQUFPLElBQUksRUFBRSxDQUFiO0FBQ0gsS0FOYyxDQUFmOztBQVFBLFdBQU8sT0FBTyxDQUFQLEtBQWEsT0FBTyxDQUFQLEVBQVUsRUFBOUI7QUFDSDs7QUFFTSxJQUFNLDhEQUEyQixTQUFTLHdCQUFULENBQWtDLENBQWxDLEVBQW9DLENBQXBDLEVBQXNDO0FBQzFFLFFBQUksV0FBVyx1QkFBdUIsRUFBQyxJQUFELEVBQUcsSUFBSCxFQUF2QixDQUFmO0FBQ0EsZ0NB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WUFBTixHQUFxQixRQUFyQjtBQUNBO0FBQ0gsQ0FITTs7QUFLQSxJQUFNLHNEQUF1QixTQUFTLG9CQUFULENBQThCLFVBQTlCLEVBQXlDO0FBQ3pFLFVBQU0sTUFBTixHQUFlLFVBQWY7QUFDSCxDQUZNOztBQUlBLElBQU0sa0NBQWEsU0FBUyxVQUFULENBQW9CLFFBQXBCLEVBQTZCLE1BQTdCLEVBQW9DLE1BQXBDLEVBQTJDO0FBQ2pFLFFBQUksU0FBUyxNQUFNLE9BQU4sQ0FBYyxRQUFkLENBQWI7QUFDQSxXQUFPLEVBQVAsSUFBYSxNQUFiO0FBQ0EsV0FBTyxFQUFQLElBQWEsTUFBYjtBQUNBO0FBQ0gsQ0FMTSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJcclxuZXhwb3J0IGNvbnN0IENBTlZBU19JRCA9IFwibXlDYW52YXNcIjtcclxuZXhwb3J0IGNvbnN0IElOUFVUX0lEID0gXCJuQ2lyY2xlc1wiO1xyXG4iLCIvKiBjb250cm9sbGVyLmpzICovXHJcbi8vIFRoZSBDIGluIE1WQy4gIEJhc2ljYWxseSBnbHVlIGNvZGUuXHJcblxyXG5pbXBvcnQge1xyXG4gICAgZ2V0U3RhdGUsXHJcbiAgICBzZXRBY3RpdmVDaXJjbGUsXHJcbiAgICBzYXZlQ3Vyc29yQ29vcmRpbmF0ZSxcclxuICAgIG1vdmVDaXJjbGVcclxufSBmcm9tICcuL3N0b3JlJztcclxuXHJcbmltcG9ydCB7ZGlzdGFuY2V9IGZyb20gJy4vZ2VuZXJhdGlvbic7XHJcblxyXG5mdW5jdGlvbiBmaW5kQ2lyY2xlQXRDb29yZGluYXRlKGNvb3JkKXtcclxuICAgIGNvbnN0IHJlZHVjZWQgPSBnZXRTdGF0ZSgpLmNpcmNsZXMuZmlsdGVyKFxyXG4gICAgICAgIGMgPT4ge1xyXG4gICAgICAgICAgICBpZihNYXRoLmFicyhjb29yZC54IC0gYy5jeCkgPiBjLnIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYoTWF0aC5hYnMoY29vcmQueSAtIGMuY3kpID4gYy5yKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICk7XHJcblxyXG5cclxuICAgIGNvbnN0IGNpcmNsZSA9IHJlZHVjZWQuZmlsdGVyKGMgPT4ge1xyXG4gICAgICAgIHZhciBkID0gZGlzdGFuY2UoXHJcbiAgICAgICAgICAgIHt4OmMuY3gsIHk6Yy5jeX0sXHJcbiAgICAgICAgICAgIGNvb3JkXHJcbiAgICAgICAgKTtcclxuICAgICAgICByZXR1cm4gZCA8IGMucjtcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjaXJjbGVbMF0gJiYgY2lyY2xlWzBdLmlkO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3Qgb2J0YWluQ2lyY2xlQXRDb29yZGluYXRlID0gZnVuY3Rpb24gb2J0YWluQ2lyY2xlQXRDb29yZGluYXRlKHgseSl7XHJcbiAgICBsZXQgY2lyY2xlSWQgPSBmaW5kQ2lyY2xlQXRDb29yZGluYXRlKHt4LHl9KTtcclxuICAgIHNldEFjdGl2ZUNpcmNsZShjaXJjbGVJZCk7XHJcbiAgICBzYXZlQ3Vyc29yQ29vcmRpbmF0ZSh7eCx5fSk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgcmVsZWFzZUNpcmNsZSA9IGZ1bmN0aW9uIHJlbGVhc2VDaXJjbGUoKXtcclxuICAgIHNldEFjdGl2ZUNpcmNsZShudWxsKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBtb3ZlQ3Vyc29yID0gZnVuY3Rpb24gbW92ZUN1cnNvcih4LHkpe1xyXG4gICAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xyXG4gICAgaWYoc3RhdGUuYWN0aXZlQ2lyY2xlID09PSBudWxsKSByZXR1cm47IC8vIG5vIGNpcmNsZSBzZWxlY3RlZC5cclxuXHJcbiAgICBjb25zdCBkWCA9IHggLSBzdGF0ZS5sYXN0WFkueCxcclxuICAgICAgICAgIGRZID0geSAtIHN0YXRlLmxhc3RYWS55O1xyXG4gICAgbW92ZUNpcmNsZShzdGF0ZS5hY3RpdmVDaXJjbGUsZFgsZFkpO1xyXG4gICAgc2F2ZUN1cnNvckNvb3JkaW5hdGUoe3gseX0pO1xyXG59O1xyXG4iLCIvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBVdGlsaXR5XHJcblxyXG5mdW5jdGlvbiByYW5kQmV0d2VlbihtaW4sbWF4KXtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqKG1heC1taW4rMSkpK21pbjtcclxufVxyXG5cclxuZnVuY3Rpb24gZGlzdGFuY2UoY0EsY0Ipe1xyXG4gICAgdmFyIGksIGQ9IDAuMDtcclxuICAgIGZvcihpIGluIGNBKXtcclxuICAgICAgICB2YXIgZGVsdGEgPSBjQVtpXS1jQltpXTtcclxuICAgICAgICBkICs9IGRlbHRhKmRlbHRhO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIE1hdGguc3FydChkKTtcclxufVxyXG5cclxuZXhwb3J0IHtkaXN0YW5jZX07XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBQcm94aW1pdHkgRGV0ZWN0aW9uXHJcblxyXG5mdW5jdGlvbiBjYW5JbnNlcnQoYXJyLGNvb3JkaW5hdGUscHJveGltaXR5KXtcclxuICAgIHZhciByZWR1Y2VkID0gYXJyLmZpbHRlciggYyA9PiB7XHJcblxyXG4gICAgICAgIHZhciBpO1xyXG4gICAgICAgIGZvcihpIGluIGMpe1xyXG4gICAgICAgICAgICBpZihNYXRoLmFicyggY1tpXSAtIGNvb3JkaW5hdGVbaV0gKSA+IHByb3hpbWl0eSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG4gICAgLy9jb25zb2xlLmxvZyhyZWR1Y2VkKTtcclxuXHJcbiAgICByZXR1cm4gIXJlZHVjZWQuc29tZSggYyA9PiAoZGlzdGFuY2UoYyxjb29yZGluYXRlKSA8IHByb3hpbWl0eSkpO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDb29yZGluYXRlc1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDb29yZGluYXRlcyh7Y291bnQscmFkaXVzLGNhbnZhc0hlaWdodCxjYW52YXNXaWR0aH0pe1xyXG4gICAgdmFyIGFyciA9IFtdLCBpLCByID0gcmFkaXVzLCByZXRyaWVzID0gMDtcclxuXHJcbiAgICBmb3IoaT0wO2k8Y291bnQ7aSsrKXtcclxuICAgICAgICB2YXIgYyA9IHtcclxuICAgICAgICAgICAgeDpyYW5kQmV0d2VlbihyLGNhbnZhc1dpZHRoLXIpLFxyXG4gICAgICAgICAgICB5OnJhbmRCZXR3ZWVuKHIsY2FudmFzSGVpZ2h0LXIpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYoIWNhbkluc2VydChhcnIsYywyKnIpKXtcclxuICAgICAgICAgICAgaS0tO1xyXG4gICAgICAgICAgICBpZihyZXRyaWVzKysgPiAxMDAwKSByZXR1cm4gbnVsbDsgLy8gbmVlZCBzbWFsbGVyIHJhZGl1cy5cclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcnIucHVzaChjKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYXJyO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBDb2xvcnNcclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlQ29sb3JzKHtjb3VudH0pe1xyXG4gICAgdmFyIGFyciA9IFtdLGkscmV0cmllcyA9IDAsY29sb3JEaXZlcnNpdHkgPSAyMDA7XHJcbiAgICBmb3IoaT0wO2k8Y291bnQ7aSsrKXtcclxuICAgICAgICB2YXIgY29sb3IgPSB7XHJcbiAgICAgICAgICAgIHI6cmFuZEJldHdlZW4oMCwyNTUpLFxyXG4gICAgICAgICAgICBnOnJhbmRCZXR3ZWVuKDAsMjU1KSxcclxuICAgICAgICAgICAgYjpyYW5kQmV0d2VlbigwLDI1NSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBpZighY2FuSW5zZXJ0KGFycixjb2xvcixjb2xvckRpdmVyc2l0eSkpe1xyXG4gICAgICAgICAgICBpLS07XHJcbiAgICAgICAgICAgIGlmKHJldHJpZXMrKyA+IDEwMDApe1xyXG4gICAgICAgICAgICAgICAgY29sb3JEaXZlcnNpdHkgLz0gMjtcclxuICAgICAgICAgICAgICAgIHJldHJpZXMgPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXJyLnB1c2goY29sb3IpO1xyXG4gICAgICAgIHJldHJpZXMgPSAwOyAvLyByZXNldCByZXRyaWVzLlxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGFycjtcclxufVxyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gQ2lyY2xlc1xyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGVDaXJjbGVzKHtjb3VudCxjYW52YXNIZWlnaHQsY2FudmFzV2lkdGh9KXtcclxuICAgIHZhciBhcnIgPSBbXSwgaTtcclxuXHJcbiAgICB2YXIgciA9IDUwLCBjb2xvcjtcclxuXHJcbiAgICB2YXIgY29vcmRzO1xyXG4gICAgd2hpbGUoICEoY29vcmRzID0gZ2VuZXJhdGVDb29yZGluYXRlcyh7Y291bnQ6Y291bnQscmFkaXVzOnIsY2FudmFzSGVpZ2h0LGNhbnZhc1dpZHRofSkpICl7XHJcbiAgICAgICAgci09NTtcclxuICAgICAgICBpZihyID09PSAwKSB0aHJvdyBcIlRvbyBtYW55IGNpcmNsZXNcIjtcclxuICAgIH1cclxuICAgIHZhciBjb2xvcnMgPSBnZW5lcmF0ZUNvbG9ycyh7Y291bnQ6Y291bnR9KTtcclxuXHJcbiAgICBmb3IoIGkgPSAwOyBpIDwgY291bnQ7IGkrKyApe1xyXG5cclxuICAgICAgICBjb2xvciA9IFwicmdiKFwiKyBbY29sb3JzW2ldLnIsIGNvbG9yc1tpXS5nLCBjb2xvcnNbaV0uYl0uam9pbignLCcpKyBcIilcIjtcclxuXHJcbiAgICAgICAgYXJyLnB1c2goe1xyXG4gICAgICAgICAgICBpZDppLFxyXG4gICAgICAgICAgICBjeDpjb29yZHNbaV0ueCxcclxuICAgICAgICAgICAgY3k6Y29vcmRzW2ldLnksXHJcbiAgICAgICAgICAgIHIsXHJcbiAgICAgICAgICAgIGNvbG9yXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIHJldHVybiBhcnI7XHJcbn1cclxuXHJcbmV4cG9ydCB7Z2VuZXJhdGVDaXJjbGVzfTtcclxuIiwiLyogaW5kZXguanMgKi9cclxuXHJcbi8vIFRoaXMgd2lsbCBhbHNvIGNvbnRhaW4gbXVjaCBvZiB0aGUgXCJ2aWV3XCIgcGFydCBvZiBhbiBNVkMgYXJjaGl0ZWN0dXJlLlxyXG5cclxuaW1wb3J0IHtDQU5WQVNfSUQsSU5QVVRfSUR9IGZyb20gJy4vY29uc3RhbnRzJztcclxuaW1wb3J0IHtkcmF3Q2lyY2xlc30gZnJvbSAnLi9yZW5kZXInO1xyXG5cclxuaW1wb3J0IHtcclxuICAgIGdldFN0YXRlLFxyXG4gICAgc2V0Q2FudmFzRGltZW5zaW9ucyxcclxuICAgIHNldE51bWJlck9mQ2lyY2xlcyxcclxuICAgIGFkZENoYW5nZUxpc3RlbmVyXHJcbn0gZnJvbSAnLi9zdG9yZSc7XHJcblxyXG5pbXBvcnQge1xyXG4gICAgb2J0YWluQ2lyY2xlQXRDb29yZGluYXRlLFxyXG4gICAgcmVsZWFzZUNpcmNsZSxcclxuICAgIG1vdmVDdXJzb3JcclxufSBmcm9tICcuL2NvbnRyb2xsZXInO1xyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gSGVscGVyXHJcblxyXG5mdW5jdGlvbiBnZXRDYW52YXMoKXtcclxuICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChDQU5WQVNfSUQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDdXJzb3JQb3NpdGlvbihjYW52YXMsIGV2ZW50KSB7XHJcbiAgICB2YXIgcmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIHZhciB4ID0gZXZlbnQuY2xpZW50WCAtIHJlY3QubGVmdDtcclxuICAgIHZhciB5ID0gZXZlbnQuY2xpZW50WSAtIHJlY3QudG9wO1xyXG4gICAgcmV0dXJuIHt4LHl9O1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBVcGRhdGUgLyBSZW5kZXJcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZSgpe1xyXG4gICAgY29uc3Qgc3RhdGUgPSBnZXRTdGF0ZSgpO1xyXG5cclxuICAgIHZhciBpbnB1dEVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElOUFVUX0lEKTtcclxuICAgIGlucHV0RWxtLmRlZmF1bHRWYWx1ZSA9IHN0YXRlLm51bWJlck9mQ2lyY2xlcztcclxuXHJcbiAgICB2YXIgY29vcmRpbmF0ZUVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2lyY2xlLWNvb3JkaW5hdGVzXCIpO1xyXG4gICAgdmFyIGNpcmNsZSA9IHN0YXRlLmNpcmNsZXNbc3RhdGUuYWN0aXZlQ2lyY2xlXTtcclxuICAgIGNvb3JkaW5hdGVFbG0uaW5uZXJIVE1MID0gY2lyY2xlID8gKFwiKFwiICsgY2lyY2xlLmN4ICsgXCIsXCIgKyBjaXJjbGUuY3kgKyBcIilcIikgOiBcIlwiO1xyXG5cclxuICAgIGRyYXdDaXJjbGVzKCBzdGF0ZS5jaXJjbGVzICk7XHJcblxyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBFdmVudCBIYW5kbGluZ1xyXG5cclxuZnVuY3Rpb24gb25OdW1iZXJPZkNpcmNsZXNDaGFuZ2UoZSl7XHJcbiAgICB2YXIgbkNpcmNsZXMgPSBwYXJzZUludChlLnRhcmdldC52YWx1ZSkgfHwgMDtcclxuICAgIHNldE51bWJlck9mQ2lyY2xlcyhuQ2lyY2xlcyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZU1vdXNlRG93bihldmVudCl7XHJcbiAgICBjb25zdCBjYW52YXMgPSBnZXRDYW52YXMoKTtcclxuICAgIGNvbnN0IGN1cnNvciA9IGdldEN1cnNvclBvc2l0aW9uKGNhbnZhcyxldmVudCk7XHJcblxyXG4gICAgb2J0YWluQ2lyY2xlQXRDb29yZGluYXRlKGN1cnNvci54LGN1cnNvci55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTW91c2VNb3ZlKGV2ZW50KXtcclxuICAgIGNvbnN0IGNhbnZhcyA9IGdldENhbnZhcygpO1xyXG4gICAgY29uc3QgY3Vyc29yID0gZ2V0Q3Vyc29yUG9zaXRpb24oY2FudmFzLGV2ZW50KTtcclxuXHJcbiAgICBtb3ZlQ3Vyc29yKGN1cnNvci54LGN1cnNvci55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlTW91c2VVcCgpe1xyXG4gICAgcmVsZWFzZUNpcmNsZSgpO1xyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBJbml0aWFsaXphdGlvblxyXG5cclxud2luZG93Lm9ubG9hZCA9ICgpPT57XHJcblxyXG4gICAgLy8gYWRqdXN0IGNhbnZhcyBkaW1pbmVuc2lvbnNcclxuICAgIHZhciBjYW52YXMgPSBnZXRDYW52YXMoKTtcclxuICAgIGNhbnZhcy5oZWlnaHQgPSBjYW52YXMucGFyZW50Tm9kZS5vZmZzZXRIZWlnaHQ7XHJcbiAgICBjYW52YXMud2lkdGggPSBjYW52YXMucGFyZW50Tm9kZS5vZmZzZXRXaWR0aDtcclxuICAgIHNldENhbnZhc0RpbWVuc2lvbnMoY2FudmFzLmhlaWdodCxjYW52YXMud2lkdGgpO1xyXG5cclxuICAgIC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsaGFuZGxlTW91c2VEb3duKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsaGFuZGxlTW91c2VNb3ZlKTtcclxuICAgIGNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLGhhbmRsZU1vdXNlVXApO1xyXG5cclxuICAgIHZhciBpbnB1dEVsbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKElOUFVUX0lEKTtcclxuICAgIGlucHV0RWxtLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsb25OdW1iZXJPZkNpcmNsZXNDaGFuZ2UpO1xyXG5cclxuICAgIC8vIGluaXRpYWxpemVcclxuICAgIGlucHV0RWxtLmRlZmF1bHRWYWx1ZSA9IGdldFN0YXRlKCkubnVtYmVyT2ZDaXJjbGVzO1xyXG4gICAgYWRkQ2hhbmdlTGlzdGVuZXIodXBkYXRlKTtcclxuXHJcbiAgICBzZXROdW1iZXJPZkNpcmNsZXMoNSk7XHJcbn07XHJcbiIsIlxyXG5pbXBvcnQge0NBTlZBU19JRH0gZnJvbSAnLi9jb25zdGFudHMnO1xyXG5cclxuZnVuY3Rpb24gZHJhd0NpcmNsZShjdHgse2N4PTUwLGN5PTUwLHI9NTAsY29sb3I9XCIjZjAwXCJ9PXt9KXtcclxuICAgIGN0eC5maWxsU3R5bGU9Y29sb3I7XHJcbiAgICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgICBjdHguYXJjKFxyXG4gICAgICAgIGN4LFxyXG4gICAgICAgIGN5LFxyXG4gICAgICAgIHIsXHJcbiAgICAgICAgMCxcclxuICAgICAgICBNYXRoLlBJICogMixcclxuICAgICAgICB0cnVlXHJcbiAgICApO1xyXG4gICAgY3R4LmZpbGwoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0NpcmNsZXMoY2lyY2xlcyl7XHJcbiAgICAvLyBnZXQgY29udGV4dFxyXG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKENBTlZBU19JRCk7XHJcbiAgICB2YXIgY29udGV4dCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuICAgIC8vIGNsZWFyIGNhbnZhc1xyXG4gICAgY29udGV4dC5jbGVhclJlY3QoMCwwLGNhbnZhcy53aWR0aCxjYW52YXMuaGVpZ2h0KTtcclxuXHJcbiAgICAvLyBkcmF3IGNpcmNsZXNcclxuICAgIHZhciBpO1xyXG4gICAgZm9yKGk9MDtpPGNpcmNsZXMubGVuZ3RoO2krKyl7XHJcbiAgICAgICAgZHJhd0NpcmNsZShjb250ZXh0LGNpcmNsZXNbaV0pO1xyXG4gICAgfVxyXG59XHJcblxyXG5leHBvcnQge2RyYXdDaXJjbGVzfTtcclxuIiwiaW1wb3J0IHtnZW5lcmF0ZUNpcmNsZXN9IGZyb20gJy4vZ2VuZXJhdGlvbic7XHJcblxyXG5cclxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuLy8gU3RhdGVcclxuXHJcbmxldCBzdGF0ZSA9IHtcclxuICAgIG51bWJlck9mQ2lyY2xlczowLFxyXG4gICAgY2lyY2xlczpbXSxcclxuICAgIGFjdGl2ZUNpcmNsZTpudWxsLFxyXG4gICAgbGFzdFhZOnt4OjAseTowfSxcclxuICAgIGNhbnZhc0hlaWdodDowLFxyXG4gICAgY2FudmFzV2lkdGg6MFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldFN0YXRlID0gZnVuY3Rpb24gZ2V0U3RhdGUoKXtcclxuICAgIHJldHVybiBzdGF0ZTtcclxufTtcclxuXHJcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbi8vIENoYW5nZSBMaXN0ZW5pbmcgTWVjaGFuaXNtXHJcblxyXG5sZXQgY2hhbmdlTGlzdGVuZXJzID0gW107XHJcblxyXG5leHBvcnQgY29uc3QgYWRkQ2hhbmdlTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRDaGFuZ2VMaXN0ZW5lcihjYWxsYmFjayl7XHJcbiAgICBjaGFuZ2VMaXN0ZW5lcnMucHVzaChjYWxsYmFjayk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBlbWl0Q2hhbmdlKCl7XHJcbiAgICB2YXIgaSwgbCA9IGNoYW5nZUxpc3RlbmVycy5sZW5ndGg7XHJcbiAgICBmb3IoaT0wO2k8bDtpKyspe1xyXG4gICAgICAgIGNoYW5nZUxpc3RlbmVyc1tpXSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4vLyBBY3Rpb25zXHJcblxyXG5mdW5jdGlvbiByZWdlbmVyYXRlQ2lyY2xlcygpe1xyXG4gICAgc3RhdGUuY2lyY2xlcyA9IGdlbmVyYXRlQ2lyY2xlcyh7XHJcbiAgICAgICAgY291bnQ6IHN0YXRlLm51bWJlck9mQ2lyY2xlcyxcclxuICAgICAgICBjYW52YXNXaWR0aDogc3RhdGUuY2FudmFzV2lkdGgsXHJcbiAgICAgICAgY2FudmFzSGVpZ2h0OiBzdGF0ZS5jYW52YXNIZWlnaHRcclxuICAgIH0pO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3Qgc2V0Q2FudmFzRGltZW5zaW9ucyA9IGZ1bmN0aW9uIHNldENhbnZhc0RpbWVuc2lvbnMoaGVpZ2h0LHdpZHRoKXtcclxuICAgIHN0YXRlLmNhbnZhc0hlaWdodCA9IGhlaWdodDtcclxuICAgIHN0YXRlLmNhbnZhc1dpZHRoID0gd2lkdGg7XHJcbiAgICByZWdlbmVyYXRlQ2lyY2xlcygpO1xyXG4gICAgZW1pdENoYW5nZSgpO1xyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IHNldE51bWJlck9mQ2lyY2xlcyA9IGZ1bmN0aW9uIHNldE51bWJlck9mQ2lyY2xlcyhudW1iZXJPZkNpcmNsZXMpe1xyXG4gICAgc3RhdGUubnVtYmVyT2ZDaXJjbGVzID0gbnVtYmVyT2ZDaXJjbGVzO1xyXG4gICAgcmVnZW5lcmF0ZUNpcmNsZXMoKTtcclxuICAgIGVtaXRDaGFuZ2UoKTtcclxufTtcclxuXHJcbmV4cG9ydCBjb25zdCBzZXRBY3RpdmVDaXJjbGUgPSBmdW5jdGlvbiBzZXRBY3RpdmVDaXJjbGUoY2lyY2xlSWQpe1xyXG4gICAgc3RhdGUuYWN0aXZlQ2lyY2xlID0gY2lyY2xlSWQ7XHJcbiAgICBlbWl0Q2hhbmdlKCk7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3Qgc2F2ZUN1cnNvckNvb3JkaW5hdGUgPSBmdW5jdGlvbiBzYXZlQ3Vyc29yQ29vcmRpbmF0ZShjb29yZGluYXRlKXtcclxuICAgIHN0YXRlLmxhc3RYWSA9IGNvb3JkaW5hdGU7XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgbW92ZUNpcmNsZSA9IGZ1bmN0aW9uIG1vdmVDaXJjbGUoY2lyY2xlSWQsZGVsdGFYLGRlbHRhWSl7XHJcbiAgICB2YXIgY2lyY2xlID0gc3RhdGUuY2lyY2xlc1tjaXJjbGVJZF07XHJcbiAgICBjaXJjbGUuY3ggKz0gZGVsdGFYO1xyXG4gICAgY2lyY2xlLmN5ICs9IGRlbHRhWTtcclxuICAgIGVtaXRDaGFuZ2UoKTtcclxufTtcclxuIl19
