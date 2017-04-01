import {generateCircles} from './generation';


// -----------------------------------------------------------------------------
// State

let state = {
    numberOfCircles:0,
    circles:[],
    activeCircle:null,
    lastXY:{x:0,y:0},
    canvasHeight:0,
    canvasWidth:0
};

export const getState = function getState(){
    return state;
};

// -----------------------------------------------------------------------------
// Change Listening Mechanism

let changeListeners = [];

export const addChangeListener = function addChangeListener(callback){
    changeListeners.push(callback);
};

function emitChange(){
    var i, l = changeListeners.length;
    for(i=0;i<l;i++){
        changeListeners[i]();
    }
}

// -----------------------------------------------------------------------------
// Actions

function regenerateCircles(){
    state.circles = generateCircles({
        count: state.numberOfCircles,
        canvasWidth: state.canvasWidth,
        canvasHeight: state.canvasHeight
    });
}

export const setCanvasDimensions = function setCanvasDimensions(height,width){
    state.canvasHeight = height;
    state.canvasWidth = width;
    regenerateCircles();
    emitChange();
};

export const setNumberOfCircles = function setNumberOfCircles(numberOfCircles){
    state.numberOfCircles = numberOfCircles;
    regenerateCircles();
    emitChange();
};

export const setActiveCircle = function setActiveCircle(circleId){
    if(circleId === undefined) circleId = null;
    state.activeCircle = circleId;
    emitChange();
};

export const saveCursorCoordinate = function saveCursorCoordinate(coordinate){
    state.lastXY = coordinate;
};

export const moveCircle = function moveCircle(circleId,deltaX,deltaY){
    var circle = state.circles[circleId];
    if(!circle) return;
    circle.cx += deltaX;
    circle.cy += deltaY;
    emitChange();
};
