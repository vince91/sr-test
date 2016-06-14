function initUser(messageCallback) {
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    
    var wsUri = "ws://localhost:8090/";
    var signalingChannel = createSignalingChannel(wsUri);
    var servers = { iceServers: [{urls: "stun:stun.1.google.com:19302"}] };
    var currentID;
    var connectedIDs;

    var peerConnections = {};
    var channels = {};

    function createPeerConnection(peerId) {
        var pc = new RTCPeerConnection(servers, {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        });
            
        pc.onicecandidate = function (evt) {
            if(evt.candidate){ // empty candidate (wirth evt.candidate === null) are often generated
                signalingChannel.sendICECandidate(evt.candidate, peerId);
            }
        };

        pc.ondatachannel = function(event) {
            var receiveChannel = event.channel;
            console.log("channel received");
            receiveChannel.onmessage = function(event){
                messageCallback(event.data);
            };
            channels[peerId] = receiveChannel;
        };


        return pc;
    }

    function createDataChannel(peerConnection, peerId) {
        //:warning the dataChannel must be opened BEFORE creating the offer.
        var commChannel = peerConnection.createDataChannel('communication', {
            reliable: false
        });

        peerConnection.createOffer(function(offer){
            peerConnection.setLocalDescription(offer);
            console.log('send offer');
            signalingChannel.sendOffer(offer, peerId);
        }, function (e){
            console.error(e);
        });
        
        commChannel.onclose = function(evt) {
            console.log("dataChannel closed");
        };

        commChannel.onerror = function(evt) {
            console.error("dataChannel error");
        };

        commChannel.onopen = function(){
            console.log("dataChannel opened");
        };

        commChannel.onmessage = function(message){
            messageCallback(message.data);
        };

        return commChannel;
    }

    signalingChannel.onInit = function(currentID, connectedIDs) {
        console.log("connected to tracker")
        console.log("id:", currentID, "connected peers:", connectedIDs);

        for (var i = 0; i < connectedIDs.length; ++i) {
            var peerID = connectedIDs[i];
            if (currentID != peerID) {
                var peerConnection = createPeerConnection(peerID);
                channels[peerID] = createDataChannel(peerConnection, peerID);
                peerConnections[peerID] = peerConnection;
            }
        }
    }

    signalingChannel.onAnswer = function (answer, sourceId) {
        console.log('receive answer from ', sourceId);
        peerConnections[sourceId].setRemoteDescription(new RTCSessionDescription(answer));
    };

    signalingChannel.onICECandidate = function (ICECandidate, sourceId) {
        console.log("receiving ICE candidate from ", sourceId);
        peerConnections[sourceId].addIceCandidate(new RTCIceCandidate(ICECandidate));
    };

    signalingChannel.onOffer = function (offer, sourceId) {
        console.log('receive offer');
        var peerConnection = createPeerConnection(sourceId);
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        peerConnection.createAnswer(function(answer){
            peerConnection.setLocalDescription(answer);
            console.log('send answer');
            signalingChannel.sendAnswer(answer, sourceId);
        }, function (e){
            console.error(e);
        });

        peerConnection[sourceId] = peerConnection;
    };
}

window.onload = function() {
    initUser(function(message){
        console.log('message', message);
    });
}
