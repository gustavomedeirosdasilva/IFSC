////////////////////////////////////////
// WebRTC peer client.
////////////////////////////////////////
var SimpleSignalClient = require('simple-signal-client')
var socket = io();
var peerClient = new SimpleSignalClient(socket)

peerClient.on('request', function (request) {
    request.accept( {trickle: false, config: {iceServers: [{url: 'stun:stun.l.google.com:19302'}]}});
});

var peer = null;
peerClient.on('peer', function (p) {
    peer = p;

    peer.on('signal', function (data) {
        console.log(data.sdp);
    });

    peer.on('connect', function () {

    });

    peer.on('data', function (data) {
        ReplyFromServer(data);
    });

    peer.on('close', function () {

    });
    
    peer.on('error', function (err) {

    });

});


////////////////////////////////////////
// Room signaling.
////////////////////////////////////////
function CreateRoom(roomName, userName) {
    if (peer) {
        peer.send(JSON.stringify({'msgType': 'CreateRoom', 'msg': {'roomName': roomName, 'userName': userName, 'peerId': peer.id}}));
    }
}

window.CreateRoom = CreateRoom;

function JoinRoom(roomName, userName) {
    if (peer) {
        peer.send(JSON.stringify({'msgType': 'JoinRoom', 'msg': {'roomName': roomName, 'userName': userName, 'peerId': peer.id}}));
    }
}

window.JoinRoom = JoinRoom;

function ExitRoom(roonName) {
    if (peer) {
        peer.send(JSON.stringify({'msgType': 'ExitRoom', 'msg': {'roomName': roonName, 'peerId': peer.id}}));
    }
}

window.ExitRoom = ExitRoom;

function SendData(data) {
    if (peer) {
        peer.send(JSON.stringify({'msgType': 'UserData', 'msg': data}));
    }
}

window.SendData = SendData;


function ReplyFromServer(data) {
    data = JSON.parse(data);

    if (!data.msgType && !data.msg) {
        console.log('Invalid data: ', data);
        return;
    }  

    switch (data.msgType) {
        case 'CreateRoomReply':
            CreateRoomReply(data.msg);
            break;
        case 'JoinRoomReply':
            JoinRoomReply(data.msg);
            break;
        case 'ExitRoomReply':
            ExitRoomReply(data.msg);
            break;
        case 'DataFromServer':
            RecvData(data.msg);
            break;
        default:
    } 
}
