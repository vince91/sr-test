function SignalingChannel(){

    var _ws;
    var self = this;

    this.connectToTracker = function(url) {
        _ws = new WebSocket(url);
        _ws.onopen = _onConnectionEstablished;
        _ws.onclose = _onClose;
        _ws.onmessage = _onMessage;
        _ws.onerror = _onError;
    };

    function _onConnectionEstablished() {
        _sendMessage('init');
    }

    function _onClose() {
        console.error("connection closed");
    }

    function _onError(err) {
        console.error("error:", err);
    }

    function _onMessage(event) {
        var data = JSON.parse(event.data);
        switch (data.type) {
            case "ICECandidate":
                self.onICECandidate(data.ICECandidate, data.source);
                break;
            case "offer":
                self.onOffer(data.offer, data.source);
                break;
            case "answer":
                self.onAnswer(data.answer, data.source);
                break;
            case "init":
                self.onInit(data.currentId, data.connectedIds);
                break;
            default:
                throw new Error("invalid message type");
        }
    }

    function _sendMessage(type, data, destination) {
        var message = {};
        message.type = type;
        message[type] = data;
        message.destination = destination;
        _ws.send(JSON.stringify(message));
    }

    this.sendICECandidate = function(ICECandidate, destination) {
        _sendMessage("ICECandidate", ICECandidate, destination);
    };

    this.sendOffer = function(offer, destination) {
        _sendMessage("offer", offer, destination);
    };

    this.sendAnswer = function(answer, destination) {
        _sendMessage("answer", answer, destination);
        
    };

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
    };
}

window.createSignalingChannel = function(url){
    var signalingChannel = new SignalingChannel();
    signalingChannel.connectToTracker(url);
    return signalingChannel;
};
