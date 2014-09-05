var MAX_ROOMS = 4;

var rooms = [];

var io = require('socket.io').listen(1337);

io.on('connection', function (socket) {
    console.log('connect: ' + socket.id);

    var room;
    if(rooms.length < MAX_ROOMS) {
        room = createRoom(rooms.length);
        rooms.push(room);
    } else {
        room = rooms[Math.floor(Math.random() * rooms.length)];
    }

    room.join(socket);

    socket.on('switch_room', function (data) {
        rooms[data.roomId].leave(socket);

        if(rooms.length < MAX_ROOMS) {
            room = createRoom(rooms.length);          
            rooms.push(room);
            room.join(socket);
        } else {
            rooms[(data.roomId + 1) % MAX_ROOMS].join(socket);
        }
    });
});

function createRoom(roomId) {
    return require('./js/Room.js')(io, roomId);
}
