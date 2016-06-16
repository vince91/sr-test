function PeerSignalingChannel(dataChannel){

    var _dataChannel = dataChannel;
    var self = this;

    dataChannel.onclose = _onClose;
    dataChannel.onerror = _onError;
    dataChannel.onmessage = _onMessage;

    function _onClose(){
        console.log('dataChannel closed with', _dataChannel.peerId);
    }

    function _onError(err){
        console.log('dataChannel error with', _dataChannel.peerId);
    }

    function _onMessage(evt){
        var objMessage = JSON.parse(evt.data);
        switch (objMessage.type) {
            case "ICECandidate":
                self.onICECandidate(objMessage.ICECandidate, objMessage.destination, objMessage.source, _dataChannel.peerId);
                break;
            case "offer":
                self.onOffer(objMessage.offer, objMessage.destination, objMessage.source, _dataChannel.peerId);
                break;
            case "answer":
                self.onAnswer(objMessage.answer, objMessage.destination, objMessage.source, _dataChannel.peerId);
                break;
            case "init":
                self.onInit(objMessage.id, objMessage.contactId);
                break;
            case "list":
                self.onList(objMessage.list);
                break;
            case "message":
                self.onMessage(objMessage.message, _dataChannel.peerId);
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
        _dataChannel.send(JSON.stringify(message));
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

    //default handler, should be overriden 
    this.onOffer = function(offer, destination, source, respondTo){
        console.log("offer from peer:", source, ':', offer);
    };

    //default handler, should be overriden 
    this.onAnswer = function(answer, destination, source, respondTo){
        console.log("answer from peer:", source, ':', answer);
    };

    //default handler, should be overriden 
    this.onICECandidate = function(ICECandidate, source){
        console.log("ICECandidate from peer:", source, ':', ICECandidate);
    };

    //default handler, should be overriden 
    this.onList = function(list){
        console.log("received list", list);
    };    

    //default handler, should be overriden 
    this.onMessage = function(message, peerId){
        console.log("received list");
    }; 
}

window.createPeerSignalingChannel = function(channels){
    var signalingChannel = new PeerSignalingChannel(channels);
    return signalingChannel;
};
