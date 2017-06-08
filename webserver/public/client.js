var socket = io();

var fft_canvas = document.getElementById("fft_canvas");
fft_canvas.style.backgroundColor = '#1f1d1d';

var fft_canvas_ctx = fft_canvas.getContext("2d");
fft_canvas_ctx.canvas.width  = window.innerWidth*0.8;
fft_canvas_ctx.canvas.height = window.innerHeight*0.40;

console.log(fft_canvas.height);

////////////////////////////////////////
// WebSocket Logic.
////////////////////////////////////////
socket.on('connect',function() {
    console.log('Client has connected to the server!');
    enableTimer();
});

var fft_data = [];
socket.on('fft_data', function (data) {
    fft_data = data;
    clearCanvasFFT();
    drawGridFFT();
    drawFFT();
});

socket.on('disconnect',function() {
    console.log('The client has disconnected!');
});


////////////////////////////////////////
// Draw canvas Logic.
////////////////////////////////////////
function clearCanvasFFT() {
    fft_canvas_ctx.beginPath();
    fft_canvas_ctx.clearRect(0, 0, fft_canvas.width, fft_canvas.height);
}

function drawGridFFT() {
    fft_canvas_ctx.beginPath();
    for (y = 0; y > -140; y -= 20) {
        fft_canvas_ctx.moveTo(fft_canvas.height/4, dB2canvas(y));
        fft_canvas_ctx.lineTo(fft_canvas.width, dB2canvas(y));
        drawText(y + ' dB', fft_canvas.height/4, dB2canvas(y));
    }
    fft_canvas_ctx.setLineDash([2, 5]);
    fft_canvas_ctx.lineWidth = 0.5;
    fft_canvas_ctx.strokeStyle = '#ffffff';
    fft_canvas_ctx.stroke();
}

function drawFFT() {
    if (fft_data) {
        fft_canvas_ctx.beginPath();
        relation = fft_canvas.width / fft_data.length;
        for(x = 0, y = 0; x < fft_data.length; x += relation, y += 1){
            fft_canvas_ctx.moveTo(x+0.5, dB2canvas(fft_data[y+1]));
            fft_canvas_ctx.lineTo(x, dB2canvas(fft_data[y]));
        }
        fft_canvas_ctx.setLineDash([]);
        fft_canvas_ctx.lineWidth = 0.7;
        fft_canvas_ctx.strokeStyle = '#ffffff';
        fft_canvas_ctx.stroke();
    } else {
        fft_canvas_ctx.font = fft_canvas.height/5 + 'px Arial';
        fft_canvas_ctx.fillStyle = '#ffff00';
        fft_canvas_ctx.textAlign = 'center';
        fft_canvas_ctx.textBaseline = 'middle';
        fft_canvas_ctx.fillText('NO DATA AVAILABLE', fft_canvas.width/2, fft_canvas.height/2);
    }
}

function dB2canvas(fft_point, dB_max, dB_min) {
    if (dB_max <= dB_min || dB_max == null || dB_min == null) {
        dB_max = 15;
        dB_min = -135;
    }   
    return ((fft_point - dB_max)*fft_canvas.height) / (dB_min - dB_max);
}

function drawText(text, x, y) {
    fft_canvas_ctx.font = fft_canvas.height/15 + 'px Arial';
    fft_canvas_ctx.fillStyle = '#ffff00';
    fft_canvas_ctx.textAlign = 'right';
    fft_canvas_ctx.textBaseline="middle";
    fft_canvas_ctx.fillText(text, x, y);
}

////////////////////////////////////////
// Timer Logic.
////////////////////////////////////////
var timer = null;
var refresh_time = 175; // in ms.

function enableTimer() { 
    timer = setInterval(function() {
        socket.emit('fft_data');
    }, refresh_time);
}

function disableTimer() {
    if (timer) {
        clearInterval(timer);
    }
}
