var socket = io();

var fft_canvas = document.getElementById("fft_canvas");
fft_canvas.style.backgroundColor = '#1f1d1d';

var fft_canvas_ctx = fft_canvas.getContext("2d");
fft_canvas_ctx.canvas.width  = window.innerWidth*0.8;
fft_canvas_ctx.canvas.height = window.innerHeight*0.40;


var demodulation_type = document.getElementById('demodulation_type');
demodulation_type.value = 'wfm';

demodulation_type.addEventListener('change',
    function () {
        var settings = {'demodulation_type': demodulation_type.value}
        socket.emit('change_settings', settings);
    }
);


////////////////////////////////////////
// WebSocket Logic.
////////////////////////////////////////
socket.on('connect',function() {
    console.log('Client has connected to the server!');

    var settings = {'demodulation_type': demodulation_type.value, 'frequency': '209734000'}
    socket.emit('change_settings', settings);

    enableFFTTimer();
});

socket.on('fft_data', function (data) {
    console.log('fft_data');

    fft_data = data;
    clearCanvasFFT();
    drawGridFFT();
    drawFFT();
});

socket.on('audio_data', function (data) {
    console.log('audio_data');

    var audio = data2audio(data);
    Array.prototype.push.apply(audio_buffer, audio);

    if (!audio_buffer_timer)
        enableAudioBufferTimer();

});

socket.on('disconnect',function() {
    console.log('The client has disconnected!');

    clearCanvasFFT();
    drawGridFFT();
    drawNoDataAvailable();
    disableFFTTimer();
});


////////////////////////////////////////
// Audio Logic.
////////////////////////////////////////
var audio_gain = document.getElementById("audio_gain");
audio_gain.value = 1;

var audio_buffer = [];

var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function data2audio(data) {
    var data = new DataView(data);
    var audio16 = new Int16Array(data.byteLength / Int16Array.BYTES_PER_ELEMENT);
    var len = audio16.length;

    for (var i = 0; i < len; i++) {
        audio16[i] = data.getInt16(i*Int16Array.BYTES_PER_ELEMENT, true);
    }

    //var audio32 = new Float32Array(audio16.length);
    var audio32 = new Array(audio16.length);

    for (var i = 0; i < audio16.length; i++) {
        var normalized = audio16[i] / 32768;
        audio32[i] = normalized;
    }

    return audio32;
}

function playAudio() {
    var scriptNode = audioCtx.createScriptProcessor(1024, 0, 1);

    scriptNode.onaudioprocess = function(audioProcessingEvent) {
        var outputBuffer = audioProcessingEvent.outputBuffer;
        var outputData = outputBuffer.getChannelData(0);
        var audio_buffer_playing = audio_buffer.splice(0, outputData.length);

        for (var sample = 0; sample < outputData.length; sample++) {
            outputData[sample] = audio_gain.value*audio_buffer[sample];
        }
    }

//    scriptNode.disconnect(audioCtx.destination);
    scriptNode.connect(audioCtx.destination);
}


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

var fft_data = [];
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
        drawNoDataAvailable;
    }
}

function drawNoDataAvailable() {
    fft_canvas_ctx.font = fft_canvas.height/5 + 'px Arial';
    fft_canvas_ctx.fillStyle = '#ffff00';
    fft_canvas_ctx.textAlign = 'center';
    fft_canvas_ctx.textBaseline = 'middle';
    fft_canvas_ctx.fillText('NO DATA AVAILABLE', fft_canvas.width/2, fft_canvas.height/2);
}

function dB2canvas(fft_point, dB_max, dB_min) {
    if (dB_max <= dB_min || dB_max == null || dB_min == null) {
        //dB_max = 15;
        //dB_min = -135;
        dB_max = 5;
        dB_min = -115;
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
var fft_refresh_time = document.getElementById('fft_refresh_time');
fft_refresh_time.value = '200';

fft_refresh_time.addEventListener('change',
    function () {
        disableFFTTimer();
        enableFFTTimer();
    }
);

var fft_timer = null;
function enableFFTTimer() { 
    fft_timer = setInterval(function() {
        socket.emit('fft_data');

console.log('fft_refresh_time: ' + fft_refresh_time.value);

    }, fft_refresh_time.value); // in ms.
}

function disableFFTTimer() {
    if (fft_timer) {
        clearInterval(fft_timer);
    }
}

var audio_buffer_timer = null;
var refresh_audio_buffer_time = 200; // in ms.

function enableAudioBufferTimer() { 
    audio_buffer_timer = setInterval(function() {
        console.log('timer');
        playAudio();
        disableAudioBufferTimer();
    }, refresh_audio_buffer_time);
}

function disableAudioBufferTimer() {
    if (audio_buffer_timer) {
        clearInterval(audio_buffer_timer);
    }
}
