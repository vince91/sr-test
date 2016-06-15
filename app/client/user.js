function initUser(messageCallback, userlistCallback) {
    var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
    var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
    var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;
    
    var wsUri = 'ws://localhost:8090/';
    var servers = { iceServers: [{urls: 'stun:stun.1.google.com:19302'}] };

    var myId;
    var contactId;
    var connectedPeers = {};

    var channels = {};
    var serverSignalingChannel = createServerSignalingChannel(wsUri);
    var peerSignalingChannel = {};
    var self = this;

    function onMessage(sourceId, message) {
        message = JSON.parse(message);
        //console.log('message from', sourceId, ':', message);
        switch (message.type) {
            case "list":
                onListReceived(message.list);
                break;
            case "offer":
                onOffer(message.offer, message.destination, message.source, sourceId);
                break;
            case "ICECandidate":
                onICECandidate(message.ICECandidate, message.destination, message.source, sourceId);
                break;
            case "answer":
                onAnswer(message.answer, message.destination, message.source, sourceId);
                break;
            case "message":
                messageCallback(message.message, sourceId);
                break;
            default:
                throw new Error("invalid message type");
        }
    }

    function onOffer(offer, destination, source, respondTo) {
        if (destination === self.myId) {
            console.log('received offer from', source);
            if (!connectedPeers[source])
            connectedPeers[source] = createPeerConnection2(source, respondTo);

            var pc = connectedPeers[source];
            pc.setRemoteDescription(new RTCSessionDescription(offer));
            pc.createAnswer(function(answer){
                pc.setLocalDescription(answer);
                console.log('send answer to', source);
                channels[respondTo].send(JSON.stringify({
                    type: 'answer',
                    answer: answer,
                    destination: source,
                    source: self.myId
                }));
            }, function (e){
                console.error(e);
            });

        } else {
            console.log('transmit offer from', source, 'to', destination)
            channels[destination].send(JSON.stringify({
                type: 'offer',
                offer: offer,
                source: source,
                destination: destination
            }));
        }
    }

    function onAnswer(answer, destination, source, respondTo) {
        if (destination === self.myId) {
            console.log('received answer from', source);
            connectedPeers[source].setRemoteDescription(new RTCSessionDescription(answer));

        } else {
            console.log('transmit answer from', source, 'to', destination)
            channels[destination].send(JSON.stringify({
                type: 'answer',
                answer: answer,
                source: source,
                destination: destination
            }));
        }
    }

    function onICECandidate(ICECandidate, destination, source, respondTo) {
        if (destination === self.myId) {
            console.log('received ICE candidate from', source);
            if (!connectedPeers[source])
                connectedPeers[source] = createPeerConnection2(source, respondTo);

            connectedPeers[source].addIceCandidate(new RTCIceCandidate(ICECandidate));
        } else {
            console.log('transmit ICE candidate from', source, 'to', destination)
            channels[destination].send(JSON.stringify({
                type: 'ICECandidate',
                ICECandidate: ICECandidate,
                source: source,
                destination: destination
            }));
        }
    }

    function createOffer(pc, id) {
        
    }
    function onListReceived(list) {

        for (var i = 0; i < list.length; ++i) {
            (function(id){
                console.log(id);
                var pc = createPeerConnection2(id, self.contactId);
                connectedPeers[id] = pc;
                channels[id] = createDataChannel(pc, id);
                pc.createOffer(function(offer) {
                    pc.setLocalDescription(offer);
                    console.log('send offer to', id);
                    channels[self.contactId].send(JSON.stringify({
                        type: 'offer',
                        offer: offer,
                        source: self.myId,
                        destination: id
                    }));
                }, function(e) {
                    console.error(e);
                });
            }(Number(list[i])));
        }
    }

    function createPeerConnection2(peerId, respondTo) {

         var pc = new RTCPeerConnection(servers, {
            optional: [{DtlsSrtpKeyAgreement: true}]
        });
                
        pc.onicecandidate = function(event) {
            if(event.candidate) {
                console.log('send ICE candidate to', peerId, respondTo);
                 channels[respondTo].send(JSON.stringify({
                    type: 'ICECandidate',
                    ICECandidate: event.candidate,
                    source: self.myId,
                    destination: peerId
                }));
            }
        };

        pc.ondatachannel = function(event) {
            var receiveChannel = event.channel;
            console.log('channel received from', peerId);
            userlistCallback(peerId);

            receiveChannel.onmessage = function(event) {
                onMessage(peerId, event.data);
            }
            channels[peerId] = receiveChannel;
        };

        return pc;
    }

    function createPeerConnection(peerId) {

        var peerConnection = new RTCPeerConnection(servers, {
            optional: [{DtlsSrtpKeyAgreement: true}]
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
            userlistCallback(peerId);

            // send peer list
            var list = [];
            for (id in connectedPeers) {
                if (id !== peerId && id != peerId)
                    list.push(id)
            }
            receiveChannel.send(JSON.stringify({
                type: 'list',
                list: list
            }));

            receiveChannel.onmessage = function(event) {
                onMessage(peerId, event.data);
            }
            channels[peerId] = receiveChannel;
        };

        return peerConnection;
    }

    function createDataChannel(peerConnection, peerId) {

        var dataChannel = peerConnection.createDataChannel('communication', {
            reliable: false
        });
        
        dataChannel.onclose = function(event) {
            console.log('dataChannel closed with', peerId);
        };

        dataChannel.onerror = function(event) {
            console.error('dataChannel error with', peerId);
        };

        dataChannel.onopen = function() {
            console.log('dataChannel opened with', peerId);
            userlistCallback(peerId);
        };

        dataChannel.onmessage = function(event){
            onMessage(peerId, event.data);
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

    window.channels = channels;
}

window.onload = function() {

    document.getElementById('send').onclick = function() {
        var message = document.getElementById('message').value;
        var peerId = Number(document.getElementById('userlist').value);
        channels[peerId].send(JSON.stringify({
            type: 'message',
            message: message
        }));
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
