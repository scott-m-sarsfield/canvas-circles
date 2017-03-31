/* controller.js */
// The C in MVC.  Basically glue code.

import {
    getState,
    setActiveCircle,
    saveCursorCoordinate,
    moveCircle
} from './store';

import {distance} from './generation';

function findCircleAtCoordinate(coord){
    const reduced = getState().circles.filter(
        c => {
            if(Math.abs(coord.x - c.cx) > c.r) return false;
            if(Math.abs(coord.y - c.cy) > c.r) return false;
            return true;
        }
    );


    const circle = reduced.filter(c => {
        var d = distance(
            {x:c.cx, y:c.cy},
            coord
        );
        return d < c.r;
    });

    return circle[0] && circle[0].id;
}

export const obtainCircleAtCoordinate = function obtainCircleAtCoordinate(x,y){
    let circleId = findCircleAtCoordinate({x,y});
    setActiveCircle(circleId);
    saveCursorCoordinate({x,y});
};

export const releaseCircle = function releaseCircle(){
    setActiveCircle(null);
};

export const moveCursor = function moveCursor(x,y){
    const state = getState();
    if(state.activeCircle === null) return; // no circle selected.

    const dX = x - state.lastXY.x,
          dY = y - state.lastXY.y;
    moveCircle(state.activeCircle,dX,dY);
    saveCursorCoordinate({x,y});
};
