/* index.js */

// This will also contain much of the "view" part of an MVC architecture.

import {CANVAS_ID,INPUT_ID} from './constants';
import {
    clear,
    drawCircles,
    drawBezierCurveFromAToB
} from './render';

import {
    getState,
    setCanvasDimensions,
    setNumberOfCircles,
    addChangeListener
} from './store';

import {
    obtainCircleAtCoordinate,
    releaseCircle,
    moveCursor
} from './controller';

// -----------------------------------------------------------------------------
// Helper

function getCanvas(){
    return document.getElementById(CANVAS_ID);
}

function getCursorPosition(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    return {x,y};
}

// -----------------------------------------------------------------------------
// Update / Render

function update(){
    const state = getState();

    var inputElm = document.getElementById(INPUT_ID);
    inputElm.defaultValue = state.numberOfCircles;

    var coordinateElm = document.getElementById("circle-coordinates");
    var circle = state.circles[state.activeCircle];
    coordinateElm.innerHTML = circle ? ("(" + circle.cx + "," + circle.cy + ")") : "";


    clear();
    drawCircles( state.circles );

    // also draw bezier curve between first two circles.
    if(state.numberOfCircles >= 2){
        drawBezierCurveFromAToB({
            x:state.circles[0].cx,
            y:state.circles[0].cy
        },{
            x:state.circles[1].cx,
            y:state.circles[1].cy
        },
            state.circles[0].r
        );
    }

}

// -----------------------------------------------------------------------------
// Event Handling

function onNumberOfCirclesChange(e){
    var nCircles = parseInt(e.target.value) || 0;
    setNumberOfCircles(nCircles);
}

function handleMouseDown(event){
    const canvas = getCanvas();
    const cursor = getCursorPosition(canvas,event);

    obtainCircleAtCoordinate(cursor.x,cursor.y);
}

function handleMouseMove(event){
    const canvas = getCanvas();
    const cursor = getCursorPosition(canvas,event);

    moveCursor(cursor.x,cursor.y);
}

function handleMouseUp(){
    releaseCircle();
}

// -----------------------------------------------------------------------------
// Initialization

window.onload = ()=>{

    // adjust canvas diminensions
    var canvas = getCanvas();
    canvas.height = canvas.parentNode.offsetHeight;
    canvas.width = canvas.parentNode.offsetWidth;
    setCanvasDimensions(canvas.height,canvas.width);

    // add event listeners
    canvas.addEventListener("mousedown",handleMouseDown);
    canvas.addEventListener("mousemove",handleMouseMove);
    canvas.addEventListener("mouseup",handleMouseUp);

    var inputElm = document.getElementById(INPUT_ID);
    inputElm.addEventListener('change',onNumberOfCirclesChange);

    // initialize
    inputElm.defaultValue = getState().numberOfCircles;
    addChangeListener(update);

    setNumberOfCircles(5);
};
