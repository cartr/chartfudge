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
    history.replaceState({'page':'initial'},'');
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
    var interpolateDataPoints = function(x,y) {
        var dx = -currentDrawLocation[0]+x;
        var dy = -currentDrawLocation[1]+y;
        var numIntermediateValues = Math.abs(dx) - 1;
        if (numIntermediateValues < 100) {
            for (var i=0; i<numIntermediateValues; i++) {
                addSquiggleDataPoint(currentDrawLocation[0] + (dx*i/numIntermediateValues), currentDrawLocation[1] + (dy*i/numIntermediateValues));
            }
        }
        addSquiggleDataPoint(x,y);
        redrawSquiggleView(canvas, ctx);
        currentDrawLocation = [x,y];
    }
    canvas.addEventListener("mousemove", function(event) {
        if (event.buttons & 1) {
            interpolateDataPoints(event.offsetX, event.offsetY);
        }
        currentDrawLocation = [event.offsetX, event.offsetY];
    });
    
    canvas.ontouchstart = (function(event) {
        var x = event.touches[0].clientX - canvas.getBoundingClientRect().left;
        var y = event.touches[0].clientY - canvas.getBoundingClientRect().top;
        if (x >= 0 && y >= 0 && x <= 300 && y <= 200) {
            currentDrawLocation = [x,y];
            addSquiggleDataPoint(x,y);
            redrawSquiggleView(canvas, ctx);
        }
        return false;
    });
    
    canvas.ontouchmove = (function(event) {
        var x = event.touches[0].clientX - canvas.getBoundingClientRect().left;
        var y = event.touches[0].clientY - canvas.getBoundingClientRect().top;
        if (x >= 0 && y >= 0 && x <= 300 && y <= 200) {
            interpolateDataPoints(x, y);
        }
        return false;
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
        chartArea: {left: 40, bottom:40, top:30, right:0},
        title: document.getElementById('charttitle').value,
        enableInteractivity: false,
        legend: {position: "none"},
        height: 260,
        animation: {duration: 100, easing: "inAndOut"}
    };
    if (document.getElementById("theme").selectedIndex === 1) {
        options.fontName = "Times New Roman";
        options.fontSize = 12;
        options.hAxis.gridlines = {color: "white"};
        options.vAxis.gridlines = {color: "white"};
        options.hAxis.titleTextStyle = {italic: false};
        options.vAxis.titleTextStyle = {italic: false};
        options.colors = ["black"];
        options.lineWidth = 1;
        options.pointSize = 5;
        options.pointShape = "square";
    }
    if (/^\s*$/.test(options.vAxis.title)) {
        options.chartArea.left = 5;
        options.height -= 20;
    }
    if (/^\s*$/.test(options.hAxis.title)) {
        options.chartArea.bottom = 5;
        options.height -= 15;
    }
    if (/^\s*$/.test(options.title)) {
        options.chartArea.top = 5;
        options.height -= 15;
    }
    var trendlineselect = document.getElementById("trendline");
    if (trendlineselect.selectedIndex > 0) {
        options.trendlines = {0: {type: trendlineselect.options[trendlineselect.selectedIndex].value, degree: 5}};
        if (document.getElementById("theme").selectedIndex === 1) {
            options.trendlines[0].pointSize = 0;
        }
    }
    gchart.draw(gchartdata, options);
    setTimeout(fixChartExportLinks,150);
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
    
    if (gchartdata == undefined) {
        gchartdata = new google.visualization.DataTable();
        gchartdata.addColumn('number','X');
        gchartdata.addColumn('number','Y');
    }
    gchartdata.removeRows(0,gchartdata.getNumberOfRows());
    gchartdata.addRows(fudgedChartData);
}

function fixChartExportLinks() {
    var svgString = new XMLSerializer().serializeToString(document.querySelector('#chart_div svg'));
    var canvas = document.getElementById("invisible_svg_rendering_canvas");
    canvas.width = parseInt(document.querySelector('#chart_div svg').getAttribute("width"))*3;
    canvas.height = parseInt(document.querySelector('#chart_div svg').getAttribute("height"))*3;
    var img = new Image();
    var ctx = canvas.getContext("2d");
    ctx.scale(3, 3);
    var url = "data:image/svg+xml;base64," + btoa(svgString);
    img.onload = function() {
        ctx.drawImage(img, 0, 0);
        var pngUrl = canvas.toDataURL("image/png");
        document.querySelector('#graphexport').href = pngUrl;
    };
    img.src = url;
    
    var csvString = '"'+(document.getElementById('xaxis').value.replace('"','""'))+'","'+(document.getElementById('yaxis').value.replace('"','""'))+'"\n';
    for (var i=0; i<gchartdata.getNumberOfRows(); i++) {
        csvString += gchartdata.getValue(i,0)+","+gchartdata.getValue(i,1)+"\r\n";
    }
    document.querySelector('#dataexport').href = "data:text/csv;base64,"+btoa(csvString);
}

window.onpopstate = function(event) {
    if (!event.state || event.state.page === undefined) {
        document.body.className = "initial";
    } else {
        squiggleDataToChartData();
        chartDataToFudgedChartData();
        drawRealChart();
        document.body.className=event.state.page;
    }
}

document.body.ontouchstart = function() {
    document.body.parentElement.className = "istouch";
}