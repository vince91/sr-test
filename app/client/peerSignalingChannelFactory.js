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
        var data = JSON.parse(event.data);
        switch (data.type) {
            case "ICECandidate":
                self.onICECandidate(data.ICECandidate, data.source, data.destination, _dataChannel.peerId);
                break;
            case "offer":
                self.onOffer(data.offer, data.source, data.destination, _dataChannel.peerId);
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
                self.onMessage(data.message, _dataChannel.peerId);
                break;
            default:
                throw new Error("invalid message type");
        }
    }

    function _sendMessage(type, data, source, destination){
        var message = {};
        message.type = type;
        message[type] = data;
        message.destination = destination;
        message.source = source;
        _dataChannel.send(JSON.stringify(message));
    }

    this.sendICECandidate = function(ICECandidate, source, destination) {
        _sendMessage("ICECandidate", ICECandidate, source, destination);
    }

    this.sendOffer = function(offer, source, destination) {
        _sendMessage("offer", offer, source, destination);
    }

    this.sendAnswer = function(answer, source, destination) {
        _sendMessage("answer", answer, source, destination);   
    }

    this.sendMessage = function(message) {
        _sendMessage("message", message);
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
    this.onICECandidate = function(ICECandidate, source){
        console.log("ICECandidate from peer:", source, ':', ICECandidate);
    };

    //default handler, should be overriden 
    this.onList = function(list){
        console.log("received list", list);
    };    

    //default handler, should be overriden 
    this.onMessage = function(message, source){
        console.log("received list");
    }; 
}

window.createPeerSignalingChannel = function(channels){
    var signalingChannel = new PeerSignalingChannel(channels);
    return signalingChannel;
};
