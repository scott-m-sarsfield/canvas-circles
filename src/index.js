/* index.js */

// This will also contain much of the "view" part of an MVC architecture.
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

export const INPUT_ID = "nCircles";

// -----------------------------------------------------------------------------
// Helper

function getCanvas(){
    return document.getElementById("myCanvas");
}

function getCursorPosition(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;
    return {x,y};
}

// -----------------------------------------------------------------------------
// Update / Render

var movingACircle = false;

function update(){
    const state = getState();

    // Number of Circles input
    var inputElm = document.getElementById(INPUT_ID);
    inputElm.defaultValue = state.numberOfCircles;

    // Coordinate Display
    var coordinateElm = document.getElementById("circle-coordinates");
    var circle = state.circles[state.activeCircle];
    coordinateElm.innerHTML = circle ? ("(" + circle.cx + "," + circle.cy + ")") : "";

    // CANVAS

    var foreground = document.getElementById('myCanvas').getContext('2d');
    var background = document.getElementById('myBackgroundCanvas').getContext('2d');

    function drawTheBezierCurve(context){
        if(state.numberOfCircles < 2) return; // can't draw the curve...
        drawBezierCurveFromAToB(
            context,
            {
                x:state.circles[0].cx,
                y:state.circles[0].cy
            },{
                x:state.circles[1].cx,
                y:state.circles[1].cy
            },
            state.circles[0].r
        );
    }

    // I will be moving a circle.  Render non-relevant
    // items in the background.
    if(!movingACircle && state.activeCircle !== null){

        clear(background);

        if(state.activeCircle < 2){
            drawCircles(background,state.circles.slice(2));
        }else{
            drawCircles(background,state.circles.slice(0,state.activeCircle).concat(state.circles.slice(state.activeCircle+1)));
            drawTheBezierCurve(background);
        }

        movingACircle = true;

    // Once I'm done moving the circle, clear the background.
    }else if(movingACircle && state.activeCircle === null){
        clear(background);
        movingACircle = false;
    }

    if(movingACircle){
        clear(foreground);
        if(state.activeCircle < 2){
            drawCircles(foreground,state.circles.slice(0,2));
            drawTheBezierCurve(foreground);
        }else{
            drawCircles(foreground,[state.circles[state.activeCircle]]);
        }
    }else{

        clear(foreground);
        drawCircles(foreground, state.circles );

        if(state.numberOfCircles >= 2){
            drawTheBezierCurve(foreground);
        }
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
    var bgCanvas = document.getElementById('myBackgroundCanvas');
    bgCanvas.height = canvas.height;
    bgCanvas.width = canvas.width;

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
