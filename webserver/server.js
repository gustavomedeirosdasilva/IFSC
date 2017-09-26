////////////////////////////////////////
// Settings.
////////////////////////////////////////
const central_frequency_webpage = 100000000;
const central_frequency = 100000000;

const sample_rate = 2880000;
const MAX_CLIENTS = 30;
const fft_size = 1024;



const execSync = require('child_process').execSync;
const exec = require('child_process').exec;
del_dir();

process.on('uncaughtException',
    function (err) {
        console.log('uncaughtException: ' + err);
    }
);

const os = require('os-utils');

var allow_clients = true;

setInterval(function () {
    os.cpuUsage(
        function(pcpu) {
            var pmem = os.freememPercentage();
            //console.log('CPU Usage: ' + pcpu); 
            //console.log('MEM FREE: ' + pmem);

            if (pcpu >= 0.8 || pmem <= 0.2) {
                if (clients.length > 0) {
                    clients[0].socket.disconnect();
                }
                allow_clients = false;
            } else {
                allow_clients = true;
            }
        }
    );
}, 1000);


////////////////////////////////////////
// HTTP server.
////////////////////////////////////////
const express = require('express');
const app = express();
const web_server = require('http').createServer(app);
const io = require('socket.io')(web_server);
const port = 80;

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
        console.log('WEBSOCKET SERVER CONNECTED: (' + socket.id + ') ' + remote.address + ':' + remote.port);

        if (!allow_clients || clients.length >= MAX_CLIENTS) {
            socket.disconnect();
        }

        var client = {'socket': socket, 'spawn_demodulator': null}
        clients.push(client);

        socket.on('fft_frequency_range',
            function (data) {
                try {
                    socket.emit('fft_frequency_range', {'central_frequency': central_frequency_webpage, 'range': sample_rate});
                } catch (err) {
                }
            }
        );

        socket.on('fft_data',
            function (data) {
                try {
                    socket.emit('fft_data', fft_points[last_fft_points_position]);
                } catch (err) {
                }
            }
        );

        socket.on('change_settings',
            function (data) {

                var client = clients.find(obj => obj.socket === socket);

                if (data.frequency) {
                    if (client.frequency != data.frequency + (central_frequency - central_frequency_webpage)) {
                        client.frequency = data.frequency + (central_frequency - central_frequency_webpage);
                        change_shift_addition_cc(client);
                    }
                }

                if (data.bandwidth) {
                    if (client.bandwidth != data.bandwidth) {
                        client.bandwidth = data.bandwidth;
                        change_bandpass_fir_fft_cc(client);
                    }
                }

                if (data.demodulation_type) {
                    if (data.demodulation_type != client.demodulation_type) {
                        client.demodulation_type = data.demodulation_type;
                        deleteDemodulator(client);
                        createDemodulator(client);
                    }
                }
            }
        );

        // Used when the socket closes.
        socket.on('disconnect',
            function (data) {
                console.log('WEBSOCKET SERVER DISCONNECT: (' + socket.id + ') ' + remote.address + ':' + remote.port);

                var client = clients.find(obj => obj.socket === socket);
                if (client) {
                    var index = clients.indexOf(client);
                    clients.splice(index, 1);
                    del_client(client);
                    deleteDemodulator(client);
                    delete client;
                }
            }
        );
    }
);


////////////////////////////////////////
// Socket server. SDR connection.
////////////////////////////////////////
const net = require('net');
const socket_sdr_server = net.createServer();

const socket_sdr_server_port = 3333;
socket_sdr_server.listen(socket_sdr_server_port, '0.0.0.0');


socket_sdr_server.on('listening',
    function (e) {
        console.log('Socket SDR Server listening at port ' + socket_sdr_server_port);
    }
);

socket_sdr_server.on('error',
    function (e) {
        console.log('Socket SDR Server error at port ' + socket_sdr_server_port + ': ' + e);
        console.log('Exiting...');
        process.exit();
    }
);

socket_sdr_server.on('connection',
    function(socket) {
        console.log('SOCKET SDR SERVER CONNECTED: ' + socket.remoteAddress +':'+ socket.remotePort);

        socket.on('data',
            function(data) {
                convert_u8_f.stdin.write(data);
            }
        );

        socket.on('close',
            function(data) {
                fft_points[last_fft_points_position] = null;
                console.log('SOCKET SERVER CLOSED: ' + socket.remoteAddress + ' ' + socket.remotePort);
                convert_u8_f.stdin.write('');
            }
        );
    }
);


////////////////////////////////////////
// Demodulators and FFT processes
////////////////////////////////////////
const spawn = require('child_process').spawn;

const convert_u8_f = spawn('csdr', ['convert_u8_f']);

convert_u8_f.stdout.on('data', 
    function (data) {
            fft.stdin.write(data);
            for (var i = 0; i < clients.length; i++) {
                if (clients[i].spawn_demodulator_is_ready) {
                try {
                    clients[i].spawn_demodulator.stdin.write(data);
                } catch (err) {
                }
            }
            }
        
            delete data;
        }   
);


const fft = spawn('bash', ['/home/medeiros/webserver/ifsc_sdr_cmd.sh', 'fft', sample_rate, fft_size]);

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

function createDemodulator(client) {
    del_client(client);
    new_client(client);

    var demodulator;
    switch (client.demodulation_type) {
        case 'wfm':
            demodulator = 'wfm_demodulator';
            if (!client.bandwidth) client.bandwidth = 200000;
            if (!client.frequency) client.frequency = central_frequency;
            change_shift_addition_cc(client);
            change_bandpass_fir_fft_cc(client);
            break;

        case 'nfm':
            demodulator = 'nfm_demodulator';
            if (!client.bandwidth) client.bandwidth = 10000;
            if (!client.frequency) client.frequency = central_frequency;
            change_shift_addition_cc(client);
            change_bandpass_fir_fft_cc(client);
            break;

        case 'am':
            demodulator = 'am_demodulator';
            if (!client.bandwidth) client.bandwidth = 10000;
            if (!client.frequency) client.frequency = central_frequency;
            change_shift_addition_cc(client);
            change_bandpass_fir_fft_cc(client);
            break;


        default:
            client.spawn_demodulator = null;
            return;
    }


    client.spawn_demodulator_is_ready = false;

    client.spawn_demodulator = spawn('bash', ['/home/medeiros/webserver/ifsc_sdr_cmd.sh', demodulator, client.socket.id, central_frequency, client.frequency, sample_rate], {detached: true});

    client.spawn_demodulator.stdout.on('data',
        function (data) {
            try {
                client.socket.emit('audio_data', data);
            } catch (err) {
                console.log('client.socket.emit err: ' + err);
            }
        }
    );

    client.spawn_demodulator_is_ready = true;
}

function deleteDemodulator(client) {
    client.spawn_demodulator_is_ready = false;
    if (client.spawn_demodulator) {
        try {
            client.spawn_demodulator.stdin.end();
            client.spawn_demodulator.kill();
            //process.kill(-client.spawn_demodulator.pid);
            //process.kill(client.spawn_demodulator.pid);
            delete client.spawn_demodulator;
            client.spawn_demodulator = null;
        } catch (err) {
        }
    }
}


////////////////////////////////////////
// Others commands.
////////////////////////////////////////

function del_dir() {
    try {
        execSync('bash /home/medeiros/webserver/ifsc_sdr_cmd.sh del_dir ');
    } catch (err) {
    }
}

function new_client(client) {
    try {
        execSync('bash /home/medeiros/webserver/ifsc_sdr_cmd.sh new_client ' + client.socket.id);
    } catch (err) {
    }
}

function del_client(client) {
    try {
        execSync('bash /home/medeiros/webserver/ifsc_sdr_cmd.sh del_client ' + client.socket.id);
    } catch (err) {
    }
}

function change_shift_addition_cc(client) {
    var rate = (central_frequency - client.frequency) / sample_rate;

    exec('bash /home/medeiros/webserver/ifsc_sdr_cmd.sh change_shift_addition_cc ' + client.socket.id + ' ' + rate,
        function (e, stdout, stderr) { }
    );
}

function change_bandpass_fir_fft_cc(client) {
    var high_cut = (client.bandwidth/2) / (sample_rate/20);
    var low_cut = -high_cut;

    exec('bash /home/medeiros/webserver/ifsc_sdr_cmd.sh change_bandpass_fir_fft_cc ' + client.socket.id + ' ' + low_cut + ' ' + high_cut ,
        function (e, stdout, stderr) { }
    );
}
