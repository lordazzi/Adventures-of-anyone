var io = require('socket.io').listen(2007);

var Exception = (function(error, arg){
	var self = this;
	
	self.toString = (function(){	
		if (typeof arg == "object" && arg instanceof Array) {
			var end = arg.splice(arg.length - 1, 1);
			arg = arg.join(", ");
			if (arg != "") {
				arg += " and "+end[0];
			} else {
				arg = end[0];
			}
		}
	
		if (arg == null) {
			return "Exception: "+error;
		} else if (error == null || error == "") {
			return "Exception: missing argument '"+arg+"'";
		} else {
			return "Exception: missing argument '"+arg+"', "+error;
		}
	});
});

var GameServer = (function(args){
	if (args == null) { throw new Exception("can't create a gameserver without the user socket and a game id", ["args.heroSocket", "args.idgame"]); }
	if (args.heroSocket == null) { throw new Exception("can't create a gameserver without the session id", "args.heroSocket"); }
	if (args.idgame == null) { throw new Exception("can't create a gameserver without the game id", "args.idgame"); }
	if (args.pass == null) { args.pass = false; }
	
	var self = this;
	var helperSocket = false;
	var heroSocket = false;
	
	var __construct = (function(args){
		heroSocket = args.heroSocket;
		heroSocket.on("area", function(data){
			if (helperSocket) {
				helperSocket.emit("area", data);
			}
		});
	});
	
	self.doConnect = (function(socket, pass){
		if (helperSocket == false) {
			if (pass == args.pass || !args.pass) {
				helperSocket = socket;
				heroSocket.emit("helperConnected", {
					conn: true
				});
				
				helperSocket.on("helperKeydown", function(data){
					heroSocket.emit("helperKeydown", data);
				});
				
				helperSocket.on("helperKeyup", function(data){
					heroSocket.emit("helperKeyup", data);
				});
				
				return "online";
			} else {
				return "offline";
			}
		} else {
			return "occupied";
		}
	});
	
	self.isConnected = (function(){
		if (idhelper == false) {
			return false;
		} else {
			return true;
		}
	});
	
	__construct(args);
});

// servidor socket
var servers = [];

io.sockets.on("connection", function(emissor){
	emissor.on('keyup', function(data) {
		data.id = emissor.store.id;
		io.sockets.emit('keyup', data);
	});
	
	emissor.on('keydown', function(data) {
		data.id = emissor.store.id;
		io.sockets.emit('keydown', data);
	});
	
	emissor.on("doServer", function(data){
		if (servers[data.idgame] == null) {
			servers[data.idgame] = new GameServer({
				heroSocket: emissor,
				idgame: data.idgame,
				pass: (data.password == "")?(false):(data.password)
			});
			emissor.emit("doServerCallback", {status:"online"});
		} else {
			emissor.emit("doServerCallback", {status:"offline"});
		}
	});
	
	emissor.on("doJoin", function(data){
		if (servers[data.idgame] != null) {
			var status = servers[data.idgame].doConnect(emissor, data.password);
			emissor.emit("doJoinCallback", { status: status });
		} else {
			emissor.emit("doJoinCallback", { status: "offline" });
		}
	});
});