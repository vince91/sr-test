var connectedPeers = {};
var lastPeerId = {id:0};

function onMessage(ws, message){
    var type = message.type;
    switch (type) {
        case "ICECandidate":
            onICECandidate(message.ICECandidate, message.destination, ws.id);
            break;
        case "offer":
            onOffer(message.offer, message.destination, ws.id);
            break;
        case "answer":
            onAnswer(message.answer, message.destination, ws.id);
            break;
        case "init":
            onInit(ws);
            break;
        default:
            throw new Error("invalid message type");
    }
}

function onInit(ws){
    var id = ++lastPeerId.id;
    var contactId = null;

    var peerCount = Object.keys(connectedPeers).length;

    if (peerCount > 0) {
        var rd = Math.floor(Math.random() * (peerCount - 1) + 1);
        contactId = connectedPeers[rd].id
    }

    ws.id = id;
    connectedPeers[id] = ws;

    console.log("init from peer, given id:", id);
    console.log("contact id:", contactId);

    connectedPeers[id].send(JSON.stringify({
        type: 'init',
        id: id,
        contactId: contactId
    }));
}

function onOffer(offer, destination, source){
    console.log("offer from peer:", source, "to peer", destination);
    connectedPeers[destination].send(JSON.stringify({
        type:'offer',
        offer:offer,
        source:source,
    }));
}

function onAnswer(answer, destination, source){
    console.log("answer from peer:", source, "to peer", destination);
    connectedPeers[destination].send(JSON.stringify({
        type: 'answer',
        answer: answer,
        source: source,
    }));
}

function onICECandidate(ICECandidate, destination, source){
    console.log("ICECandidate from peer:", source, "to peer", destination);
    connectedPeers[destination].send(JSON.stringify({
        type: 'ICECandidate',
        ICECandidate: ICECandidate,
        source: source,
    }));
}

module.exports = onMessage;

//exporting for unit tests only
module.exports._connectedPeers = connectedPeers;
module.exports._lastPeerId = lastPeerId;