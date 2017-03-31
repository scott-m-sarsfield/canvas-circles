
import {CANVAS_ID} from './constants';

function drawCircle(ctx,{cx=50,cy=50,r=50,color="#f00"}={}){
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.arc(
        cx,
        cy,
        r,
        0,
        Math.PI * 2,
        true
    );
    ctx.fill();
}

function drawCircles(circles){
    // get context
    var canvas = document.getElementById(CANVAS_ID);
    var context = canvas.getContext('2d');

    // clear canvas
    context.clearRect(0,0,canvas.width,canvas.height);

    // draw circles
    var i;
    for(i=0;i<circles.length;i++){
        drawCircle(context,circles[i]);
    }
}

export {drawCircles};
