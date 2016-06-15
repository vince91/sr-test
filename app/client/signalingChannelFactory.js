function SignalingChannel(id){

    var _ws;
    var self = this;

    this.connectToTracker = function(url) {
        _ws = new WebSocket(url);
        _ws.onopen = _onConnectionEstablished;
        _ws.onclose = _onClose;
        _ws.onmessage = _onMessage;
        _ws.onerror = _onError;
    }

    this.fromPeer = function(dataChannel) {
        _ws = dataChannel;
        _ws.onclose = _onClose;
        _ws.onmessage = _onMessage;
        _ws.onerror = _onError;
    }

    function _onConnectionEstablished(){
        _sendMessage('init');
    }

    function _onClose(){
        console.error("connection closed");
    }

    function _onError(err){
        console.error("error:", err);
    }


    function _onMessage(evt){
        var objMessage = JSON.parse(evt.data);
        switch (objMessage.type) {
            case "ICECandidate":
                self.onICECandidate(objMessage.ICECandidate, objMessage.source);
                break;
            case "offer":
                self.onOffer(objMessage.offer, objMessage.source);
                break;
            case "answer":
                self.onAnswer(objMessage.answer, objMessage.source);
                break;
            case "init":
                self.onInit(objMessage.id, objMessage.contactId);
                break;
            default:
                throw new Error("invalid message type");
        }
    }

    function _sendMessage(type, data, destination){
        var message = {};
        message.type = type;
        message[type] = data;
        message.destination = destination;
        _ws.send(JSON.stringify(message));
    }

    this.sendICECandidate = function(ICECandidate, destination) {
        _sendMessage("ICECandidate", ICECandidate, destination);
    }

    this.sendOffer = function(offer, destination) {
        _sendMessage("offer", offer, destination);
    }

    this.sendAnswer = function(answer, destination) {
        _sendMessage("answer", answer, destination);   
    }

    //default handler, should be overriden 
    this.onOffer = function(offer, source){
        console.log("offer from peer:", source, ':', offer);
    };

    //default handler, should be overriden 
    this.onAnswer = function(answer, source){
        console.log("answer from peer:", source, ':', answer);
    };

    //default handler, should be overriden 
    this.onICECandidate = function(ICECandidate, source){
        console.log("ICECandidate from peer:", source, ':', ICECandidate);
    };

    //default handler, should be overriden 
    this.onInit = function(currentID, connectedIDs) {
        console.log(currentID, connectedIDs);
    }
}

window.createServerSignalingChannel = function(url){
    var signalingChannel = new SignalingChannel();
    signalingChannel.connectToTracker(url);
    return signalingChannel;
};

window.createPeerSignalingChannel = function(dataChannel) {
    var signalingChannel = new SignalingChannel();
    signalingChannel.fromPeer(dataChannel);
    return signalingChannel;
}
