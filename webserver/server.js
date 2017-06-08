////////////////////////////////////////
// HTTP server.
////////////////////////////////////////
var express = require('express');
var app = express();
var web_server = require('http').createServer(app);
var io = require('socket.io')(web_server);
var port = process.env.PORT || 8080;

web_server.listen(port, function () {
    console.log('Web Server listening at port ' + port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// WebSocket
io.on('connect', function (socket) {
    remote = socket.request.connection._peername;
    console.log('WEBSOCKET SERVER CONNECTED: ' + remote.address + ':' + remote.port);


    socket.on('fft_data', function (data) {
        socket.emit('fft_data', fft_points[last_fft_points_position]);
    });

    // Used when the socket closes.
    socket.on('disconnect', function (data) {
    });
});


////////////////////////////////////////
// Socket server (gnuradio connection).
////////////////////////////////////////
var net = require('net');
var socket_fft_server = net.createServer();

var socket_fft_server_port = 3333;
socket_fft_server.listen(socket_fft_server_port, '127.0.0.1');


socket_fft_server.on('listening', function (e) {
    console.log('Socket Server listening at port ' + socket_fft_server_port);
});

socket_fft_server.on('error', function (e) {
    console.log('Socket Server error at port ' + socket_fft_server_port + ': ' + e);
    console.log('Exiting...');
    process.exit();
});

var fft_points = [];
var fft_points_position = 0;
var last_fft_points_position = 0;

var fft_window_size = 2048;

socket_fft_server.on('connection', function(socket) {
    console.log('SOCKET SERVER CONNECTED: ' + socket.remoteAddress +':'+ socket.remotePort);

    socket.on('data', function(data) {
        arr_float = [];
        for(var i = 0; i + 3 < data.length; i += 4) {
            arr_float.push(data.readFloatLE(i));

            if (arr_float.length == fft_window_size) {
                fft_points[fft_points_position] = arr_float;

                last_fft_points_position = fft_points_position;
                if (fft_points_position == 0) fft_points_position = 1;
                else fft_points_position = 0;

                break;
            }
        }
    });

    socket.on('close', function(data) {
        fft_points[last_fft_points_position] = null;
        console.log('SOCKET SERVER CLOSED: ' + socket.remoteAddress +' '+ socket.remotePort);
    });
});
