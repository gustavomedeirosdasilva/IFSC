// rtl_sdr -s 2880000 -f 209750000 -g 30 - | nc 127.0.0.1 3333

//var central_frequency = 209734000;
var central_frequency = 209750000;
var sample_rate = 2880000;

//var central_frequency = 858841500;
//var sample_rate = 2400000;

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

var clients = [];

// WebSocket
io.on('connect',
    function (socket) {
        remote = socket.request.connection._peername;
        console.log('WEBSOCKET SERVER CONNECTED: ' + remote.address + ':' + remote.port);

        var client = {'socket': socket}

        clients.push(client);

        socket.on('fft_data',
            function (data) {
                socket.emit('fft_data', fft_points[last_fft_points_position]);
            }
        );

        socket.on('change_settings',
            function (data) {
                var client = clients.find(obj => obj.socket === socket);

                if (data.frequency != client.frequency && data.frequency) {
                    client.frequency = data.frequency;
                    deleteDemodulator(client);
                    createDemodulator(client);
                }

                if (data.demodulation_type != client.demodulation_type) {
                    if (!client.frequency) client.frequency = central_frequency;
                    deleteDemodulator(client);
                    createDemodulator(client, data.demodulation_type);
                }
            }
        );

        // Used when the socket closes.
        socket.on('disconnect',
            function (data) {
                var client = clients.find(obj => obj.socket === socket);
                var index = clients.indexOf(client);
                clients.splice(index, 1);
            }
        );
    }
);


////////////////////////////////////////
// Socket server. RTL-SDR connection.
////////////////////////////////////////
var net = require('net');
var socket_fft_server = net.createServer();

var socket_fft_server_port = 3333;
socket_fft_server.listen(socket_fft_server_port, '127.0.0.1');


socket_fft_server.on('listening',
    function (e) {
        console.log('Socket Server listening at port ' + socket_fft_server_port);
    }
);

socket_fft_server.on('error',
    function (e) {
        console.log('Socket Server error at port ' + socket_fft_server_port + ': ' + e);
        console.log('Exiting...');
        process.exit();
    }
);

socket_fft_server.on('connection',
    function(socket) {
        console.log('SOCKET SERVER CONNECTED: ' + socket.remoteAddress +':'+ socket.remotePort);

        socket.on('data',
            function(data) {
                fft.stdin.write(data);
                for (var i = 0; i < clients.length; i++) {
                    if (clients[i].spawn_demodulator) clients[i].spawn_demodulator.stdin.write(data);
                }
            }
        );

        socket.on('close',
            function(data) {
                fft_points[last_fft_points_position] = null;
                console.log('SOCKET SERVER CLOSED: ' + socket.remoteAddress +' '+ socket.remotePort);
            }
        );
    }
);


////////////////////////////////////////
// Client's process and FFT process.
////////////////////////////////////////
var spawn = require('child_process').spawn;

var fft = spawn('bash', ['ifsc_sdr_cmd.sh', 'fft']);

var fft_points = []; 
var fft_points_position = 0;
var last_fft_points_position = 1;

fft.stdout.on('data', 
    function (data) {
        var arr_float = []; 
        for(var i = 0; i + 3 < data.length; i += 4)
            arr_float.push(data.readFloatLE(i));

        fft_points[fft_points_position] = arr_float;

        last_fft_points_position = fft_points_position;
        if (fft_points_position == 0) fft_points_position = 1;
        else fft_points_position = 0;
    }
);

function createDemodulator(client, demodulation_type) {
    if (demodulation_type) client.demodulation_type = demodulation_type;

    var demodulator;
    switch (client.demodulation_type) {
        case 'wfm':
            demodulator = 'wfm_demodulator';
            break;

        case 'nfm':
            demodulator = 'nfm_demodulator';
            break;

        case 'am':
            demodulator = 'am_demodulator';
            break;

        default:
    }

    client.spawn_demodulator = spawn('bash', ['ifsc_sdr_cmd.sh', demodulator, central_frequency, client.frequency, sample_rate], {detached: true});

    if (client.spawn_demodulator) {
        client.spawn_demodulator.stdout.on('data',
            function (data) {
                client.socket.emit('audio_data', data);
            }
        );
    }
}

function deleteDemodulator(client) {
    if (client.spawn_demodulator) {
        process.kill(-client.spawn_demodulator.pid);
    }
    client.spawn_demodulator = null;
}
