var io = require('socket.io').listen(1337);

var World = require('../shared/js/World.js');

io.on('connection', function (socket) {
	console.log('connect: ' + socket.id);
	var world = World.getWorld();
	socket.emit('connection_info', {id: socket.id, world:world})

	socket.on('add_voxel', function (data) {
		if(World.addVoxel(null, data.position, data.color)) {
			io.emit('add_voxel', data);
		}
	});

	socket.on('remove_voxel', function (data) {
		if(World.removeVoxel(data.position)) {
			io.emit('remove_voxel', data);
		}
	});

	socket.on('helper_update', function (data) {
		data.id = socket.id;
		io.emit('helper_update', data);
	});

	socket.on('disconnect', function () {
	console.log('disconnect: ' + socket.id);
	io.emit('disconnect', {id: socket.id});
});

});

