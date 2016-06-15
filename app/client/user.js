function initUser(messageCallback, userlistCallback) {
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    
    var wsUri = 'ws://localhost:8090/';
    var servers = { iceServers: [{urls: 'stun:stun.1.google.com:19302'}] };

    var myId;
    var connectedPeers = {};

    var channels = {};
    var serverSignalingChannel = createServerSignalingChannel(wsUri);
    var peerSignalingChannel = null;

    function createPeerConnection(peerId) {

        var peerConnection = new RTCPeerConnection(servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });
            
        peerConnection.onicecandidate = function(event) {
            if(event.candidate) {
                console.log('send ICE candidate to', peerId);
                serverSignalingChannel.sendICECandidate(event.candidate, peerId);
            }
        };

        peerConnection.ondatachannel = function(event) {
            var receiveChannel = event.channel;
            console.log('channel received from', peerId);
            receiveChannel.onmessage = function(event) {
                console.log('message from', peerId, ':', event.data);

                if (event.data === 'list') {
                    receiveChannel.send(JSON.stringify({list: [1, 5, 9]}));
                    peerSignalingChannel = createPeerSignalingChannel(receiveChannel);
                }
            }

            channels[peerId] = receiveChannel;
        };

        return peerConnection;
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
            commChannel.send('list');
        };

        commChannel.onmessage = function(event){
            console.log('message from', peerId);
            console.log(event.data);
            var data = JSON.parse(event.data);
            if (data.list) {
                console.log('received peer list from', peerId);
            }
        };

        return commChannel;
    }

    serverSignalingChannel.onInit = function(id, contactId) {
        console.log('connected to tracker')
        console.log('my id:', id, 'my contact:', contactId);

        var myId = id;

        if (contactId) {
            var pc = createPeerConnection(contactId);
            connectedPeers[contactId] = pc;
            channels[contactId] = createDataChannel(pc, contactId);

            pc.createOffer(function(offer) {
                pc.setLocalDescription(offer);
                console.log('send offer to', contactId);
                serverSignalingChannel.sendOffer(offer, contactId);
            }, function(e) {
                console.error(e);
            });
        }
    }

    serverSignalingChannel.onAnswer = function (answer, peerId) {
        console.log('receive answer from', peerId);
        connectedPeers[peerId].setRemoteDescription(new RTCSessionDescription(answer));
        console.log(channels[peerId]);
    };

    serverSignalingChannel.onICECandidate = function (ICECandidate, peerId) {
        console.log('receiving ICE candidate from', peerId);

        if (!connectedPeers[peerId])
            connectedPeers[peerId] = createPeerConnection(peerId);

        connectedPeers[peerId].addIceCandidate(new RTCIceCandidate(ICECandidate));
    };

    serverSignalingChannel.onOffer = function (offer, peerId) {
        console.log('receive offer from', peerId);

        if (!connectedPeers[peerId])
            connectedPeers[peerId] = createPeerConnection(peerId);

        var pc = connectedPeers[peerId];
        pc.setRemoteDescription(new RTCSessionDescription(offer));
        pc.createAnswer(function(answer){
            pc.setLocalDescription(answer);
            console.log('send answer to', peerId);
            serverSignalingChannel.sendAnswer(answer, peerId);
        }, function (e){
            console.error(e);
        });
    };
}

window.onload = function() {

    document.getElementById('send').onclick = function() {
        var message = document.getElementById('message').value;
        var peerId = Number(document.getElementById('userlist').value);
        channels[peerId].send(message);
     };

    function messageCallback(message, peerId) {
        console.log('message:', message, 'from:', peerId);
        var p = document.createElement('p');
        p.innerHTML = '[' + peerId + ']' + message;
        document.getElementById('received').appendChild(p);
    }

    function userlistCallback(peerID) {
        var opt = document.createElement('option');
        opt.value = peerID;
        opt.innerHTML = peerID;
        document.getElementById('userlist').appendChild(opt);
    }

    initUser(messageCallback, userlistCallback);
}
