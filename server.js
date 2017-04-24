////////////////////////////////////////
// HTTP server.
////////////////////////////////////////
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8080;

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));


////////////////////////////////////////
// WebRTC signaling server.
////////////////////////////////////////
var wrtc = require('electron-webrtc')();
var signalServer = require('simple-signal-server')(io);

var lastID = null;
signalServer.on('discover', function (request) {
    request.discover(lastID);
    lastID = request.initiator.id;

    if (request.metadata != 'peerFromServer') {
        peerClient = new SimpleSignalClient(socketWebRTC('http://localhost:' + port), 'peerFromServer')
        PeerEvents(peerClient);
    }
});


////////////////////////////////////////
// WebRTC peer client.
////////////////////////////////////////
var SimpleSignalClient = require('simple-signal-client');
var socketWebRTC = require('socket.io-client');
var wrtc = require('electron-webrtc')();

function PeerEvents(peerClient) {
    peerClient.on('ready', function(lastId) {
        if (lastId) {
            peerClient.connect(lastId, {wrtc: wrtc});
        }
    });

    peerClient.on('peer', function (peer) {
        peer.on('connect', function () {
            //peer.send('hey! We are connected');
        })
    
        peer.on('data', function (data) {
            Signaling(peer, data);
        });
    
        peer.on('close', function () {
            console.log('Warn|Server| peer: close');
            ExitRoomClosePeer(peer);
        });
        
        peer.on('error', function (err) {
            console.log('Error|Server| peer: error: '+ err);
        });
    });
};


////////////////////////////////////////
// Room signaling.
////////////////////////////////////////
function Signaling(peer, data) {
    data = JSON.parse(data);

    console.log('Info|Client -> Server| ', data);

    if (!data.msgType && !data.msg) {
        console.log('Invalid data: ', data);
        return;
    }

    switch (data.msgType) {
        case 'CreateRoom':
            CreateRoom(peer, data.msg);
            break;
        case 'JoinRoom':
            JoinRoom(peer, data.msg);
            break;
        case 'ExitRoom':
            ExitRoom(peer, data.msg);
            break;
        case 'UserData':
            RecvData(peer, data.msg);
            break;
        default:
    }
}


var rooms = [];
var clients = [];

function CreateRoom(peer, msg) {
    if (!msg.roomName || !msg.userName || !msg.peerId) {
        replyMsg = {'msgType': 'CreateRoomReply', 'msg': {'status': 'ERROR', 'description': 'Invalid data: \"' + msg + '\".'}};
        peer.send(JSON.stringify(replyMsg));
        console.log('Erro|Server -> Client| ', replyMsg);
        return;
    }

    var r = rooms.find(obj => obj.roomName === msg.roomName);

    if (!r) {
        client = {'peer': peer, 'userName': msg.userName, 'peerId': msg.peerId, 'roomName': msg.roomName};
        clients.push(client);

        room = {'roomName': msg.roomName, 'clients' : [{'client': client}]};
        rooms.push(room);

        console.log('Info|Server| CreateRoom: peer \"' + msg.peerId + '\" created the room \"' + msg.roomName + '\".');

        replyMsg = {'msgType': 'CreateRoomReply', 'msg': {'status': 'OK', 'description': 'Created the room: \"' + msg.roomName + '\".'}};
        peer.send(JSON.stringify(replyMsg));
        console.log('Info|Server -> Client| ', replyMsg);
    } else {
        replyMsg = {'msgType': 'CreateRoomReply', 'msg': {'status': 'NOTOK', 'description': 'There is a room called: \"' + msg.roomName + '\".'}};
        peer.send(JSON.stringify(replyMsg));
        console.log('Warn|Server -> Client| ', replyMsg);
    }
}

function JoinRoom(peer, msg) {
    if (!msg.roomName || !msg.userName || !msg.peerId) {
        replyMsg = {'msgType': 'JoinRoomReply', 'msg': {'status': 'ERROR', 'description': 'Invalid data: \"' + msg + '\".'}};
        peer.send(JSON.stringify(replyMsg));
        console.log('Erro|Server -> Client| ', replyMsg);
        return;
    }

    var r = rooms.find(obj => obj.roomName === msg.roomName);

    if (r) {
        index = -1;
        for (i in r.clients) {
            if (r.clients[i].client.peerId == msg.peerId) {
                index = i;
            }
        }

        if (index == -1) {
            client = {'peer': peer, 'userName': msg.userName, 'peerId': msg.peerId, 'roomName': msg.roomName};
            clients.push(client);

            console.log('Info|Server| JoinRoom: peer \"' + msg.peerId + '\" joined in room \"' + msg.roomName + '\".');

            r.clients.push({'client': client});

            replyMsg = {'msgType': 'JoinRoomReply', 'msg': {'status': 'OK', 'description': 'Joined in the room: \"' + msg.roomName + '\".'}};
            peer.send(JSON.stringify(replyMsg));
            console.log('Info|Server -> Client| ', replyMsg);
        } else {
            replyMsg = {'msgType': 'JoinRoomReply', 'msg': {'status': 'NOTOK', 'description': 'Peer is in the room: \"' + msg.roomName + '\".'}};
            peer.send(JSON.stringify(replyMsg));
            console.log('Info|Server -> Client| ', replyMsg);
        }
    } else {
        replyMsg = {'msgType': 'JoinRoomReply', 'msg': {'status': 'NOTOK', 'description': 'There is not a room called: \"' + msg.roomName + '\".'}};
        peer.send(JSON.stringify(replyMsg));
        console.log('Warn|Server -> Client| ', replyMsg);
    }
}

function ExitRoom(peer, msg) {
    if (!msg.roomName || !msg.peerId) {
        replyMsg = {'msgType': 'ExitRoomReply', 'msg': {'status': 'ERROR', 'description': 'Invalid data: \"' + msg + '\".'}};
        peer.send(JSON.stringify(replyMsg));
        console.log('Erro|Server -> Client| ', replyMsg);
        return;
    }

    r = rooms.find(obj => obj.roomName === msg.roomName);

    if (r) {
        index = -1;
        for (i in r.clients) {
            if (r.clients[i].client.peerId == msg.peerId) {
                index = i;
            }
        }

        if (index != -1) {
            r.clients.splice(index, 1);

            console.log('Info|Server| ExitRoom: peer \"' + msg.peerId + '\" left the room \"' + msg.roomName + '\".');

            // If the client is the last in the room. The room is deleted.
            if (index == 0) {
                console.log('Info|Server| Room: \"' + msg.roomName + '\" was closed.');
                rooms.splice(rooms.indexOf(r), 1);
            }

            index = -1;
            for (i in clients) {
                if (clients[i].peerId == msg.peerId) {
                    index = i;
                }
            }
            clients.splice(index, 1);

            replyMsg = {'msgType': 'ExitRoomReply', 'msg': {'status': 'OK', 'description': 'Left the room: \"' + msg.roomName + '\".'}};
            peer.send(JSON.stringify(replyMsg));
            console.log('Info|Server -> Client| ', replyMsg);
        } else {
            replyMsg = {'msgType': 'ExitRoomReply', 'msg': {'status': 'NOTOK', 'description': 'peer is not in the room: \"' + msg.roomName + '\".'}};
            peer.send(JSON.stringify(replyMsg));
            console.log('Warn|Server -> Client| ', replyMsg);
        }
    } else {
        replyMsg = {'msgType': 'ExitRoomReply', 'msg': {'status': 'NOTOK', 'description': 'There is not a room called: \"' + msg.roomName + '\".'}};
        peer.send(JSON.stringify(replyMsg));
        console.log('Warn|Server -> Client| ', replyMsg);
    }
}

function ExitRoomClosePeer(peer) {
    index = -1;
    for (i in clients) {
        if (clients[i].peer == peer) {
            index = i;
        }
    }

    if (index != -1) {

        r = rooms.find(obj => obj.roomName === clients[index].roomName);

        console.log('Info|Server| ExitRoom: peer \"' + r.clients[i].client.peerId + '\" left the room \"' + r.clients[i].client.roomName + '\".');

        // If the client is the last in the room. The room is deleted.
        if (index == 0) {
            console.log('Info|Server| Room: \"' + r.clients[i].client.roomName + '\" was closed.');
            rooms.splice(rooms.indexOf(r), 1);
        }

        clients.splice(index, 1);

    }
}



////////////////////////////////////////
// Loop logic.
////////////////////////////////////////
function RecvData(peer, msg) {
    index = -1;
    for (i in clients) {
        if (clients[i].peer == peer) {
            index = i;
            break;
        }
    }

    if (index != -1) {
        r = rooms.find(obj => obj.roomName === clients[index].roomName);
        // Send data to all clients in the room.
        for (i in r.clients) {
            SendData(r.clients[i].client.peer, msg);
        }
    } else {
        console.log('Warn|Server| RecvData: peer is not in a room.');
    }
}

function SendData(peer, data) {
    if (peer) {
        replyMsg = {'msgType': 'DataFromServer', 'msg': data};
        peer.send(JSON.stringify(replyMsg));
        console.log('Info|Server -> Client| ', replyMsg);
    }
}
