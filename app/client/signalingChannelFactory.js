function SignalingChannel() {

    var _link;
    var self = this;

    this.connectToTracker = function(url) {
        _link = new WebSocket(url);
        _link.onopen = _onConnectionEstablished;
        _link.onclose = _onClose;
        _link.onmessage = _onMessage;
        _link.onerror = _onError;
    }

    this.fromDataChannel = function(dataChannel) {
        _link = dataChannel;
        _link.onclose = _onClose;
        _link.onerror = _onError;
        _link.onmessage = _onMessage;
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
        var data = JSON.parse(event.data);
        switch (data.type) {
            case "ICECandidate":
                self.onICECandidate(data.ICECandidate, data.source, data.destination, _link.peerId);
                break;
            case "offer":
                self.onOffer(data.offer, data.source, data.destination, _link.peerId);
                break;
            case "answer":
                self.onAnswer(data.answer, data.source, data.destination);
                break;
            case "init":
                self.onInit(data.id, data.contactId);
                break;
            case "list":
                self.onList(data.list);
                break;
            case "message":
                self.onMessage(data.message, _link.peerId);
                break;
            default:
                throw new Error("invalid message type");
        }
    }

    function _sendMessage(type, data, destination, source){
        var message = {};
        message.type = type;
        message[type] = data;
        message.destination = destination;
        message.source = source;
        _link.send(JSON.stringify(message));
    }

    this.sendICECandidate = function(ICECandidate, destination, source) {
        _sendMessage("ICECandidate", ICECandidate, destination, source);
    }

    this.sendOffer = function(offer, destination, source) {
        _sendMessage("offer", offer, destination, source);
    }

    this.sendAnswer = function(answer, destination, source) {
        _sendMessage("answer", answer, destination, source);   
    }

    this.sendMessage = function(message) {
        _sendMessage("message", message);
    }

    this.sendList = function(list) {
        _sendMessage("list", list);
    }

    //default handler, should be overriden 
    this.onOffer = function(offer, source, destination, respondTo){
        console.log("offer from peer:", source, ':', offer);
    };

    //default handler, should be overriden 
    this.onAnswer = function(answer, source, destination){
        console.log("answer from peer:", source, ':', answer);
    };

    //default handler, should be overriden 
    this.onICECandidate = function(ICECandidate, source, destination, respondTo){
        console.log("ICECandidate from peer:", source, ':', ICECandidate);
    };

    //default handler, should be overriden 
    this.onInit = function(currentID, contactId) {
        console.log(currentID, connectedIDs);
    }

    //default handler, should be overriden 
    this.onList = function(list){
        console.log("received list", list);
    };    

    //default handler, should be overriden 
    this.onMessage = function(message, source){
        console.log("received list");
    }; 
}

window.createServerSignalingChannel = function(url) {
    var signalingChannel = new SignalingChannel();
    signalingChannel.connectToTracker(url);
    return signalingChannel;
};

window.createPeerSignalingChannel = function(dataChannel) {
    var signalingChannel = new SignalingChannel();
    signalingChannel.fromDataChannel(dataChannel);
    return signalingChannel;
};