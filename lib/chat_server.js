var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames ={};
var namesUsed = [];
var currentRoom ={};
// 启动Socket.IO 服务器
exports.listen = function (server) {
	io = socketio.listen(server);
	io.set('log level', 1);
	io.sockets.on('connection',(socket)=>{
		guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);
		joinRoom(socket,'Lobby');
		handleMessageBroadcasting(socket,nickNames);
		handleNameChangeAttempts(socket,nickNames,namesUsed);
		handleRoomJoining(socket);
		socket.on('rooms',()=>{
			socket.emit('rooms',io.sockets.manager.rooms);
		})
		handleClientDisconnection(socket,nickNames,namesUsed);
	});
}
// 分配用户昵称
function assignGuestName(socket,guestNumber,nickNames,namesUsed) {
	var name = 'guest'+ guestNumber;
	nickNames[socket.id] = name;
	socket.emit('nameResult',{
		success:true,
		name:name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}
// 进入聊天室
function joinRoom(socket,room) {
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult',{room:room});
	socket.broadcast.to(room).emit('message',{
		text:nickNames[socket.id] + 'has joined ' + room + '.'
	});
	var usersInRoom = io.sockets.clients(room);
	if (usersInRoom.length > 1) {
		var usersInRoomSummary = 'Users currently in '+ room +':';
		for(var index in usersInRoom){
			var userSockedId = usersInRoom[index].id;
			if (userSockedId != socket.id) {
				if (index > 0) {
					usersInRoomSummary += ',';
				}
				usersInRoomSummary +=nickNames[userSockedId];
			}

		}
		usersInRoomSummary +='.';
		socket.emit('message',{text: usersInRoomSummary});
	}
}
// 更名请求处理
function handleNameChangeAttempts(socket,nickNames,namesUsed) {
	socket.on('nameAttempt',(name)=>{
		if (name.indexOf('Guest') == 0) {
			socket.emit('nameResult',{
				success:false,
				message:'Names cannot begin with "Guest".'
			});
		} else {
			if (namesUsed.indexOf(name) == -1) {
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];
				socket.emit('nameResult',{
					success:true,
					name:name
				});
				socket.broadcast.to(currentRoom[socket.id]).emit('message',{
					text:previousName + ' is now known as ' + name + '.'
				});
			} else {
				socket.emit('nameResult',{
					success:false,
					message:'That name is already in use.'
				});
			}
		}
	});
}
// 转发消息
function handleMessageBroadcasting(socket) {
	socket.on( 'message', (message)=>{
		socket.broadcast.to(message.room).emit('message',{
			text:nickNames[socket.id] + ':' + message.text
		});
	});
}
// 创建房间
function handleRoomJoining(socket) {
	socket.on('join',(room)=>{
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket,room.newRoom);
	});
}
// 断开连接处理
function handleClientDisconnection(socket) {
	socket.on('disconnect',()=>{
		var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[nameIndex];
		delete nickNames[socket.id];
	});
}