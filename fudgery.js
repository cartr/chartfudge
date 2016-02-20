/* global google */
function backingScale() {
    if ('devicePixelRatio' in window) {
        if (window.devicePixelRatio > 1) {
            return window.devicePixelRatio;
        }
    }
    return 1;
}

function retinaify(canvas) {
    if (!canvas.hasAttribute("data-retinaified")) {
        canvas.style.width = canvas.width+"px";
        canvas.style.height = canvas.height+"px";
        canvas.width *= backingScale();
        canvas.height *= backingScale();
        canvas.setAttribute("data-retinaified","yes");
    }
    var ctx = canvas.getContext('2d');
    ctx.scale(backingScale(), backingScale());
    return ctx;
}

var squiggleData = [];
var squiggleDataHeight = 0;

function setUpGraphDrawing(){
    var canvas = document.getElementById('drawaline');
    squiggleDataHeight = canvas.height;
    var ctx = retinaify(canvas);
    var addSquiggleDataPoint = function(x,y) {
        squiggleData[Math.floor(x/5)] = y;
    }
    var currentDrawLocation = undefined;
    canvas.addEventListener("click", function(event) {
        currentDrawLocation = [event.offsetX, event.offsetY];
        addSquiggleDataPoint(event.offsetX, event.offsetY);
        redrawSquiggleView(canvas, ctx);
    });
    canvas.addEventListener("mousemove", function(event) {
        if (event.buttons & 1) {
            var dx = -currentDrawLocation[0]+event.offsetX;
            var dy = -currentDrawLocation[1]+event.offsetY;
            var numIntermediateValues = Math.abs(dx) - 1;
            if (numIntermediateValues < 100) {
                for (var i=0; i<numIntermediateValues; i++) {
                    addSquiggleDataPoint(currentDrawLocation[0] + (dx*i/numIntermediateValues), currentDrawLocation[1] + (dy*i/numIntermediateValues));
                }
            }
            addSquiggleDataPoint(event.offsetX, event.offsetY);
            redrawSquiggleView(canvas, ctx);
        }
        currentDrawLocation = [event.offsetX, event.offsetY];
    });
    
    google.charts.load('current', {packages: ['corechart', 'line']});
}

function redrawSquiggleView(canvas, ctx) {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    var didStartPath = false;
    for (var x=0; x<squiggleData.length; x++) {
        if (squiggleData[x] !== undefined) {
            if (didStartPath) {
                ctx.lineTo(x*5,squiggleData[x]);
            } else {
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(x*5, squiggleData[x]);
                didStartPath = true;
            }
        }
    }
    ctx.stroke();
}

window.addEventListener("load", setUpGraphDrawing);
if (document.readyState == "complete") { setUpGraphDrawing(); }
console.log(document.readyState);


var gchart = undefined;
var gchartdata = undefined;

function drawRealChart() {
    if (gchart === undefined) {
        gchart = new google.visualization.LineChart(document.getElementById('chart_div'))
    }
    var options = {
        hAxis: {
          title: document.getElementById('xaxis').value
        },
        vAxis: {
          title: document.getElementById('yaxis').value
        },
        title: document.getElementById('charttitle').value,
        enableInteractivity: false,
        legend: {position: "none"}
    };
    gchart.draw(gchartdata, options);
}

var chartData = [];
function squiggleDataToChartData() {
    chartData = [];
    var leftDefinedIndex = undefined;
    var rightDefinedIndex = -1;
    for (var i=0; i<squiggleData.length; i+=Math.pow(2,-document.getElementById("density").value)) {
        if (squiggleData[i] === undefined) {
            if (leftDefinedIndex === undefined) {
                continue;
            } else if (rightDefinedIndex <= leftDefinedIndex) {
                for (var j=leftDefinedIndex+1; j<squiggleData.length; j++) {
                    if (squiggleData[j] !== undefined) {
                        rightDefinedIndex = j;
                        break;
                    }
                }
                if (rightDefinedIndex <= leftDefinedIndex) { break; }
            }
            chartData[chartData.length] = 1 - ((squiggleData[leftDefinedIndex] + (squiggleData[rightDefinedIndex] - squiggleData[leftDefinedIndex]) * (i - leftDefinedIndex) / (rightDefinedIndex - leftDefinedIndex)) / squiggleDataHeight );
        } else {
            leftDefinedIndex = i;
            chartData[chartData.length] = 1 - (squiggleData[i] / squiggleDataHeight);
        }
    }
}

function clamp(n) {
    if (n < 0) {
        return 0;
    } else if (n > 1) {
        return 1;
    }
    return n;
}

var fudgedChartData = [];
function chartDataToFudgedChartData() {
    fudgedChartData = [];
    var jitter = document.getElementById("jitter").value;
    var xmin = parseInt(document.getElementById("xaxismin").value,10);
    var xmax = parseInt(document.getElementById("xaxismax").value,10);
    if (xmin === undefined || xmax === undefined) { return; }
    if (xmin >= xmax) { return; }
    var xspread = xmax - xmin;
    
    var ymin = parseInt(document.getElementById("yaxismin").value,10);
    var ymax = parseInt(document.getElementById("yaxismax").value,10);
    if (ymin === undefined || ymax === undefined) { return; }
    if (ymin >= ymax) { return; }
    var yspread = ymax - ymin;
    for (var i=0; i<chartData.length; i++) {
        fudgedChartData[fudgedChartData.length] = [xmin + (i*xspread/(chartData.length-1)), ymin+yspread*clamp(chartData[i] + (Math.random()-0.5)*jitter)];
    }
    console.log(fudgedChartData);
    
    if (gchartdata == undefined) {
        gchartdata = new google.visualization.DataTable();
        gchartdata.addColumn('number','X');
        gchartdata.addColumn('number','Y');
    }
    gchartdata.removeRows(0,gchartdata.getNumberOfRows());
    gchartdata.addRows(fudgedChartData);
}