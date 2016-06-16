function User(messageCallback, userlistCallback) {
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    
    var wsUri = 'ws://localhost:8090/';
    var servers = { iceServers: [{urls: 'stun:stun.1.google.com:19302'}] };

    var myId;
    var contactId;
    var connectedPeers = {};
    var serverSignalingChannel = createServerSignalingChannel(wsUri);
    var channels = {};
    var self = this;

    function onOffer(offer, source, destination, respondTo) {
        if (destination === self.myId || !destination) {
            console.log('received offer from', source);

            if (!connectedPeers[source])
                connectedPeers[source] = createPeerConnection(source, respondTo);

            var pc = connectedPeers[source];
            pc.setRemoteDescription(new RTCSessionDescription(offer));
            pc.createAnswer(function(answer) {
                console.log('send answer to', source);
                pc.setLocalDescription(answer);
                if (destination)
                    channels[respondTo].sendAnswer(answer, self.myId, source);
                else
                    serverSignalingChannel.sendAnswer(answer, source);
            }, function (e){
                console.error(e);
            });
        } else {
            console.log('transmit offer from', source, 'to', destination);
            channels[destination].sendOffer(offer, source, destination);
        }
    }

    function onAnswer(answer, source, destination) {
        if (destination === self.myId || !destination) {
            console.log('received answer from', source);
            connectedPeers[source].setRemoteDescription(new RTCSessionDescription(answer));
        } else {
            console.log('transmit answer from', source, 'to', destination)
            channels[destination].sendAnswer(answer, source, destination);
        }
    }

    function onICECandidate(ICECandidate, source, destination, respondTo) {
        if (destination === self.myId || !destination) {
            console.log('received ICE candidate from', source);
            if (!connectedPeers[source])
                connectedPeers[source] = createPeerConnection(source, respondTo);

            connectedPeers[source].addIceCandidate(new RTCIceCandidate(ICECandidate));
        } else {
            console.log('transmit ICE candidate from', source, 'to', destination)
            channels[destination].sendICECandidate(ICECandidate, source, destination);
        }
    }

    function onList(list) {
        console.log("received peer list", list);
        for (var i = 0; i < list.length; ++i) {
            (function(id){
                var pc = createPeerConnection(id, self.contactId);
                connectedPeers[id] = pc;
                var dataChannel = createDataChannel(pc, id);
                channels[id] = initPeerSignalingChannel(dataChannel);

                pc.createOffer(function(offer) {
                    console.log('send offer to', id);
                    pc.setLocalDescription(offer);
                    channels[self.contactId].sendOffer(offer, self.myId, id);
                }, function(e) {
                    console.error(e);
                });
            }(list[i]));
        }
    }

    function createPeerConnection(peerId, respondTo) {

        var peerConnection = new RTCPeerConnection(servers, {
            optional: [{DtlsSrtpKeyAgreement: true}]
        });
            
        peerConnection.onicecandidate = function(event) {
            if(event.candidate) {
                console.log('send ICE candidate to', peerId);
                if (respondTo)
                    channels[respondTo].sendICECandidate(event.candidate, self.myId, peerId);
                else
                    serverSignalingChannel.sendICECandidate(event.candidate, peerId);
            }
        };

        peerConnection.ondatachannel = function(event) {
            var receiveChannel = event.channel;
            console.log('channel received from', peerId);
            userlistCallback(peerId);
            receiveChannel.peerId = peerId;
            channels[peerId] = initPeerSignalingChannel(receiveChannel);

            if (!respondTo) {
                // send peer list
                var list = [];
                for (id in connectedPeers) {
                    id = Number(id);
                    if (id !== peerId)
                        list.push(id)
                }
                channels[peerId].sendList(list);
            }
        };

        return peerConnection;
    }

    function initPeerSignalingChannel (dataChannel) {
        var peerSignalingChannel = createPeerSignalingChannel(dataChannel);
        peerSignalingChannel.onList = onList;
        peerSignalingChannel.onOffer = onOffer;
        peerSignalingChannel.onAnswer = onAnswer;
        peerSignalingChannel.onICECandidate = onICECandidate;
        peerSignalingChannel.onMessage = messageCallback;
        return peerSignalingChannel;
    }

    function createDataChannel(peerConnection, peerId) {

        var dataChannel = peerConnection.createDataChannel('communication', {
            reliable: false
        });

        dataChannel.peerId = peerId;

        dataChannel.onopen = function() {
            console.log('dataChannel opened with', peerId);
            userlistCallback(peerId);
        };

        return dataChannel;
    }

    serverSignalingChannel.onInit = function(id, contactId) {
        console.log('connected to tracker')
        console.log('my id:', id, 'my contact:', contactId);

        self.myId = id;
        self.contactId = contactId

        if (contactId) {
            var pc = createPeerConnection(contactId);
            connectedPeers[contactId] = pc;
            var dataChannel = createDataChannel(pc, contactId);
            channels[contactId] = initPeerSignalingChannel(dataChannel);

            pc.createOffer(function(offer) {
                console.log('send offer to', contactId);
                pc.setLocalDescription(offer);
                serverSignalingChannel.sendOffer(offer, contactId);
            }, function(e) {
                console.error(e);
            });
        }
    }

    serverSignalingChannel.onICECandidate = onICECandidate;
    serverSignalingChannel.onOffer = onOffer;
    serverSignalingChannel.onAnswer = onAnswer;

    this.sendMessage = function(message, destination) {
        channels[destination].sendMessage(message);
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
}
