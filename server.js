const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const port = 5000

app.get("/", (req, res) => {
    res.send("Hello World")
})

let peers = [];

const broadcastEventTypes = {
    ACTIVE_USERS: 'ACTIVE_USERS',
    GROUP_CALL_ROOMS: 'GROUP_CALL_ROOMS'
}

io.on("connection", (socket) =>{
    console.log("New user connected");
    socket.emit('connection', null);
    console.log(socket.id);

    socket.on('register-new-user', (data) => {
        peers.push({
            username: data.username, 
            socketId: data.socketId
        });

        io.sockets.emit('broadcast', {
            event: broadcastEventTypes.ACTIVE_USERS,
            activeUsers: peers
        })

        console.log('registered new user');
        console.log(peers);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        peers = peers.filter(peer => peer.socketId !== socket.id);

        io.sockets.emit('broadcast', {
            event: broadcastEventTypes.ACTIVE_USERS,
            activeUsers: peers
        });
    });

    // listeners related with direct calls

    socket.on('pre-offer', (data) => {
        console.log(data);
        console.log('pre-offer handled');
        io.to(data.callee.socketId).emit('pre-offer', {
            callerUsername: data.caller.username,
            callerSocketId: socket.id
        });
    });

    socket.on('pre-offer-answer', (data) => {
        console.log('pre-offer-answer handled');
        io.to(data.callerSocketId).emit('pre-offer-answer', {
            answer: data.answer
        });
    });

    socket.on('webRTC-offer', (data) => {
        console.log('webRTC-offer handled');
        io.to(data.calleeSocketId).emit('webRTC-offer', {
            offer: data.offer
        });
    });

    socket.on('webRTC-answer', (data) => {
        console.log('handling webRTC answer');
        io.to(data.callerSocketId).emit('webRTC-answer', {
            answer: data.answer
        });
    });

    socket.on('webRTC-candidate', (data) => {
        console.log('handling ice candidate');
        io.to(data.connectedUserSocketId).emit('webRTC-candidate', {
            candidate: data.candidate
        });
    });

    socket.on('user-hanged-up', (data) => {
        io.to(data.connectedUserSocketId).emit('user-hanged-up');
    });
});

server.listen(port, () => {
    console.log(`Server is listening on ${port}`);
});