module.exports = function(io, roomId) {
    var world = require('../../shared/js/World.js')();

    var users = [];

    function addVoxel(position, color) {
        return world.addVoxel(null, position, color);
    };

    function removeVoxel(key) {
        return world.removeVoxel(key);
    };

    function join(socket) {
        socket = socket;

        users.push(socket.id);

        socket.join(roomId);

        socket.emit('connection_info', {
            id: socket.id, 
            world: world.getWorld(),
            roomId: roomId
        });

        socket.on('add_voxel', function (data) {
            if(addVoxel(data.position, data.color)) {
                io.to(roomId).emit('add_voxel', data);
            }
        });

        socket.on('remove_voxel', function (data) {
            if(removeVoxel(data.key)) {
                io.to(roomId).emit('remove_voxel', data);
            }
        });

        socket.on('helper_update', function (data) {
            data.id = socket.id;
            io.to(roomId).emit('helper_update', data);
        });

        socket.on('disconnect', function () {
            socket.leave(roomId);
            leave(socket);
            console.log('disconnect: ' + socket.id);
            io.to(roomId).emit('disconnect', {id: socket.id});
        });

        console.log(socket.id + ' joined room: ' + roomId);
    }

    function leave(socket) {

        socket.leave(roomId);
        removeAllListeners(socket);

        users = users.filter(function (arg) {
            return arg != socket.id;
        });

        if (users.length == 0) {
            // optionally cleanup the world if there is no one left
            // world.destroyWorld();
        }

        console.log(socket.id + ' left room: ' + roomId);
    }

    function removeAllListeners(socket) {
        socket.removeAllListeners('add_voxel');
        socket.removeAllListeners('remove_voxel');
        socket.removeAllListeners('helper_update');
        socket.removeAllListeners('disconnect');
    }

    return {
        join: join,
        leave: leave
    };
};


