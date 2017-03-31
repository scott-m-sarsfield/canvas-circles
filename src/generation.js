// -----------------------------------------------------------------------------
// Utility

function randBetween(min,max){
    return Math.floor(Math.random()*(max-min+1))+min;
}

function distance(cA,cB){
    var i, d= 0.0;
    for(i in cA){
        var delta = cA[i]-cB[i];
        d += delta*delta;
    }
    return Math.sqrt(d);
}

export {distance};

// -----------------------------------------------------------------------------
// Proximity Detection

function canInsert(arr,coordinate,proximity){
    var reduced = arr.filter( c => {

        var i;
        for(i in c){
            if(Math.abs( c[i] - coordinate[i] ) > proximity) return false;
        }
        return true;
    });
    //console.log(reduced);

    return !reduced.some( c => (distance(c,coordinate) < proximity));
}

// -----------------------------------------------------------------------------
// Coordinates

function generateCoordinates({count,radius,canvasHeight,canvasWidth}){
    var arr = [], i, r = radius, retries = 0;

    for(i=0;i<count;i++){
        var c = {
            x:randBetween(r,canvasWidth-r),
            y:randBetween(r,canvasHeight-r)
        };

        if(!canInsert(arr,c,2*r)){
            i--;
            if(retries++ > 1000) return null; // need smaller radius.
            continue;
        }

        arr.push(c);
    }

    return arr;
}

// -----------------------------------------------------------------------------
// Colors

function generateColors({count}){
    var arr = [],i,retries = 0,colorDiversity = 200;
    for(i=0;i<count;i++){
        var color = {
            r:randBetween(0,255),
            g:randBetween(0,255),
            b:randBetween(0,255)
        };

        if(!canInsert(arr,color,colorDiversity)){
            i--;
            if(retries++ > 1000){
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

function generateCircles({count,canvasHeight,canvasWidth}){
    var arr = [], i;

    var r = 50, color;

    var coords;
    while( !(coords = generateCoordinates({count:count,radius:r,canvasHeight,canvasWidth})) ){
        r-=5;
        if(r === 0) throw "Too many circles";
    }
    var colors = generateColors({count:count});

    for( i = 0; i < count; i++ ){

        color = "rgb("+ [colors[i].r, colors[i].g, colors[i].b].join(',')+ ")";

        arr.push({
            id:i,
            cx:coords[i].x,
            cy:coords[i].y,
            r,
            color
        });
    }


    return arr;
}

export {generateCircles};
