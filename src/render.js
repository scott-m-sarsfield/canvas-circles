
import {CANVAS_ID} from './constants';

function drawCircle(ctx,{cx=50,cy=50,r=50,color="#f00"}={}){
    ctx.fillStyle=color;

    // add shadow to circle
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 4;
    ctx.shadowColor = "rgba(0,0,0,0.6)";

    ctx.beginPath();

    // main circle
    ctx.arc(
        cx,
        cy,
        r,
        0,
        Math.PI * 2,
        true
    );
    ctx.fill();
    ctx.closePath();

    // reset shadow parameters
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";

    // border.
    const borders = [{
        offset:-3,
        width:6,
        color:"black"
    },{
        offset:-3,
        width:3,
        color:"white"
    }];

    var i,l = borders.length;
    for(i=0;i<l;i++){
        ctx.strokeStyle = borders[i].color;
        ctx.lineWidth = borders[i].width;
        ctx.beginPath();
        ctx.arc(
            cx,
            cy,
            r + borders[i].offset,
            0,
            Math.PI*2,
            true
        );
        ctx.stroke();
        ctx.closePath();
    }


}

function getContext(){

    var canvas = document.getElementById(CANVAS_ID);
    return canvas.getContext('2d');
}

function clear(){
    // get context
    var canvas = document.getElementById(CANVAS_ID);
    var context = canvas.getContext('2d');

    // clear canvas
    context.clearRect(0,0,canvas.width,canvas.height);
}

function drawCircles(circles){
    var context = getContext();

    // draw circles
    var i;
    for(i=0;i<circles.length;i++){
        drawCircle(context,circles[i]);
    }
}


function drawBezierCurveFromAToB(pointA,pointB,radius){
    var context = getContext();

    // leftmost point is "start", other is "end"
    let start = pointA,
        end = pointB;

    if(pointA.x > pointB.x){
        start = pointB, end = pointA;
    }

    // if the end is not completely right of the start point.
    var above = (start.x + radius > end.x - radius);

    let startX = (above) ? (start.x - radius) : (start.x + radius),
        startY = start.y,
        endX = end.x - radius,
        endY = end.y;

    context.strokeStyle = "white";
    context.lineWidth = "3";
    context.beginPath();
    context.moveTo(startX,startY);
    if(above){
        context.bezierCurveTo(
            startX-20,
            startY,
            startX-20,
            endY,
            endX,
            endY
        );
    }else{
        var half = (endX - startX) / 2;
        context.bezierCurveTo(
            startX+half,
            startY,
            endX-half,
            endY,
            endX,
            endY
        );
    }
    context.stroke();
    context.closePath();
}

export {
    clear,
    drawCircles,
    drawBezierCurveFromAToB
};
