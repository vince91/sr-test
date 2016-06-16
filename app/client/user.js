function User(messageCallback, userlistCallback) {
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    
    var wsUri = 'ws://localhost:8090/';
    var signalingChannel = createSignalingChannel(wsUri);
    var servers = { iceServers: [{urls: 'stun:stun.1.google.com:19302'}] };

    var peerConnections = {};
    var channels = {};

    function createPeerConnection(peerId) {

        var peerConnection = new RTCPeerConnection(servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });
            
        peerConnection.onicecandidate = function(event) {
            if(event.candidate){ // empty candidate (wirth event.candidate === null) are often generated
                signalingChannel.sendICECandidate(event.candidate, peerId);
            }
        };

        peerConnection.ondatachannel = function(event) {
            var receiveChannel = event.channel;
            console.log('channel received from', peerId);
            receiveChannel.onmessage = function(event) {
                messageCallback(event.data, peerId);
            };
            channels[peerId] = receiveChannel;
            userlistCallback(peerId);
        };

        return peerConnection;
    }

    function createOffer(peerConnection, peerId) {
        peerConnection.createOffer(function(offer){
            peerConnection.setLocalDescription(offer);
            console.log('send offer to', peerId);
            signalingChannel.sendOffer(offer, peerId);
        }, function (e){
            console.error(e);
        });
    }

    function createDataChannel(peerConnection, peerId) {
        //:warning the dataChannel must be opened BEFORE creating the offer.
        var commChannel = peerConnection.createDataChannel('communication', {
            reliable: false
        });

        commChannel.onclose = function(event) {
            console.log('dataChannel closed with', peerId);
        };

        commChannel.onerror = function(event) {
            console.error('dataChannel error with', peerId);
        };

        commChannel.onopen = function() {
            console.log('dataChannel opened with', peerId);
        };

        commChannel.onmessage = function(message){
            messageCallback(message.data, peerId);
        };

        return commChannel;
    }

    signalingChannel.onInit = function(currentId, connectedIds) {
        console.log('connected to tracker')
        console.log('my id:', currentId, 'connected peers:', connectedIds);

        for (var i = 0; i < connectedIds.length; ++i) {
            var peerId = connectedIds[i];
            if (currentId != peerId) {
                var peerConnection = createPeerConnection(peerId);
                channels[peerId] = createDataChannel(peerConnection, peerId);
                peerConnections[peerId] = peerConnection;
                createOffer(peerConnection, peerId);
                userlistCallback(peerId);
            }
        }
    }

    signalingChannel.onAnswer = function (answer, source) {
        console.log('receive answer from', source);
        peerConnections[source].setRemoteDescription(new RTCSessionDescription(answer));
    };

    signalingChannel.onICECandidate = function (ICECandidate, source) {
        console.log('receiving ICE candidate from', source);

        if (!peerConnections[source])
            peerConnections[source] = createPeerConnection(source);

        peerConnections[source].addIceCandidate(new RTCIceCandidate(ICECandidate));
    };

    signalingChannel.onOffer = function (offer, source) {
        console.log('receive offer from', source);

        if (!peerConnections[source])
            peerConnections[source] = createPeerConnection(source);

        var pc = peerConnections[source];
        pc.setRemoteDescription(new RTCSessionDescription(offer));
        pc.createAnswer(function(answer){
            pc.setLocalDescription(answer);
            console.log('send answer to', source);
            signalingChannel.sendAnswer(answer, source);
        }, function (e){
            console.error(e);
        });
    };

    this.sendMessage = function(message, destination) {
        channels[destination].send(message);
    }
}

window.onload = function() {

    var user = new User(messageCallback, userlistCallback);

    document.getElementById('send').onclick = function() {
        var message = document.getElementById('message').value;
        var peerId = Number(document.getElementById('userlist').value);
        user.sendMessage(message, peerId);
     };

    function messageCallback(message, peerId) {
        console.log('message:', message, 'from:', peerId);
        var p = document.createElement('p');
        p.innerHTML = '[' + peerId + ']' + message;
        document.getElementById('received').appendChild(p);
    }

    function userlistCallback(peerId) {
        var opt = document.createElement('option');
        opt.value = peerId;
        opt.innerHTML = peerId;
        document.getElementById('userlist').appendChild(opt);
    }
}
