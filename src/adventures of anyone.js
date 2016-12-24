var Game = (function(args){
	//	defaults
	if (args == null) { throw new Exception("the game can't be created without a canvas", "args.canvas"); return false; }
	if (args.canvas == null) { throw new Exception("the game can't be created without a canvas", "args.canvas"); return false; }
	if (args.onload == null) { args.onload = (function(){}); }
	if (args.height == null) { args.height = 600; }
	if (args.width == null) { args.width = 800; }
	
	var self = this;
	
	var physicalCanvas;
	var physicalContext;
	var virtualCanvas;
	var virtualContext;
	
	var interval;
	var currentX = 0; // onde o jogador está
	var map;
	
	var monsters = [], heroforms = [], objects = [], powers = [];
	var systemKeys = [];
	
	var heroKeyBoard, helperKeyBoard; // teclados configurados
	var heroKey = {}, helperKey = {}; // tecla trigada
	var TheHero, TheHelper;
	
	var SocketConnection;
	var isServer = false;
	
	var __construct = (function(args){
		physicalCanvas = document.getElementById(args.canvas);
		physicalContext = physicalCanvas.getContext('2d');
		
		//	setando os teclados padrões
		heroKeyBoard = setKeyBoard();
		helperKeyBoard = setKeyBoard({
			up: 87,
			right: 68,
			left: 65,
			down: 83
		});
		
		TheHero = new Hero({
			form: args.heroForm,
			game: self
		});
		
		TheHelper = new Helper({
			form: args.helperForm,
			game: self
		});
		
		virtualCanvas = document.createElement("canvas");
		virtualCanvas.width = args.width;
		virtualCanvas.height = args.height;
		virtualContext = virtualCanvas.getContext('2d');
		virtualContext.fillRect(0, 0, args.width, args.height);
		virtualContext.fillStyle = args.color;
		virtualContext.fill();
	});

	self.realWidth = (function(){
		return virtualCanvas.width;
	});

	self.realHeight = (function(){
		return virtualCanvas.height;
	});
	
	self.addMonster = (function(args){
		if (monsters[args.name] == null) {
			monsters[args.name] = new Monster(args);
		} else {
			throw new Exception("you can't create two monsters with the same name!");
		}
	});
	
	self.addHeroForm = (function(args){
		if (heroforms[args.name] == null) {
			heroforms[args.name] = new HeroForm(args);
		} else {
			throw new Exception("you can't create two hero forms with the same name!");
		}
	});
	
	self.addObject = (function(args){
		if (objects[args.name] == null) {
			objects[args.name] = new Object(args);
		} else {
			throw new Exception("you can't create two items with the same name!");
		}
	});
	
	self.addPower = (function(args){
		if (powers[args.name] == null) {
			powers[args.name] = new Power(args);
		} else {
			throw new Exception("you can't create two powers with the same name!");
		}
	});
	
	self.getObject = (function(name){
		return objects[name];
	});
	
	self.getHeroForm = (function(name){
		return heroforms[name];
	});
	
	self.setHeroKeyBoard = (function(args){
		heroKeyBoard = setKeyBoard(args);
	});
	
	self.setHelperKeyBoard = (function(args){
		helperKeyBoard = setKeyBoard(args);
	});
	
	var setKeyBoard = (function(args){
		var keys = new KeyBoard(args);
		var ks = keys.getKeys();
		
		reloadSystemKeys();
		return keys;
	});
	
	var reloadSystemKeys = (function(){
		var keys = [];
		if (heroKeyBoard) {
			keys = heroKeyBoard.getKeys();
		}
		
		if (helperKeyBoard) {
			var helper = helperKeyBoard.getKeys();
			for (var i in helper) {
				if (keys.indexOf(helper[i]) != -1) {
					keys[keys.length] = helper[i];
				} else {
					throw new Exception("duplicated key in keyboard: each key can have only one action");
					return false;
				}
			}
		}
	});
	
	self.triggerKey = (function(code){
		if (heroKeyBoard.isMine(code)) {
			heroKey[code] = code;
			return true;
		} else if (helperKeyBoard.isMine(code)) {
			helperKey[code] = code;
			return true;
		} else {
			return false;
		}
	});
	
	self.untriggerKey = (function(code){
		if (heroKeyBoard.isMine(code)) {
			delete heroKey[code];
			return true;
		} else if (helperKeyBoard.isMine(code)) {
			delete helperKey[code];
			return true;
		} else {
			return false;
		}
	});
	
	self.setMap = (function(args){
		map = new Map({
			x: args,
			game: self,
			onload: function(){
			
			}
		});
	});
	
	var flush = (function(){
		physicalContext.drawImage(virtualCanvas, 0, 0, physicalCanvas.width, physicalCanvas.height);
	});
	
	var draw = (function(image, x, y){
		virtualContext.drawImage(image, x, y);
	});
	
	self.localConnect = (function(){
		document.body.onkeydown = function(e){ game.triggerKey(e.keyCode); }
		document.body.onkeyup = function(e){ game.untriggerKey(e.keyCode); }
	});

	self.socketConnect = (function(io){
		// aki o args se refere à uma conexão socket
		if (args.socket == null) { throw new Exception("Can't create socket server without ip and port"); }
		
		SocketConnection = io.connect(args.socket);
		SocketConnection.on("helperKeydown", function(data){
			switch(data.key) {
				case heroKeyBoard.goright:
					game.triggerKey(helperKeyBoard.goright);
					break;
				case heroKeyBoard.goleft:
					game.triggerKey(helperKeyBoard.goleft);
					break;
				case heroKeyBoard.golow:
					game.triggerKey(helperKeyBoard.golow);
					break;
				case heroKeyBoard.gojump:
					game.triggerKey(helperKeyBoard.gojump);
					break;
			}
		});
		
		SocketConnection.on("helperKeyup", function(data){
			switch(data.key) {
				case heroKeyBoard.goright:
					game.untriggerKey(helperKeyBoard.goright);
					break;
				case heroKeyBoard.goleft:
					game.untriggerKey(helperKeyBoard.goleft);
					break;
				case heroKeyBoard.golow:
					game.untriggerKey(helperKeyBoard.golow);
					break;
				case heroKeyBoard.gojump:
					game.untriggerKey(helperKeyBoard.gojump);
					break;
			}
		});
		//	tentativa de controle remoto q n deo certu
		// SocketConnection.on("keydown", function(data){
			// switch(data.key) {
				// case "to-left":
					// game.triggerKey(37);
					// break;
				// case "to-right":
					// game.triggerKey(39);
					// break;
				// case "action-2":
					// game.triggerKey(38);
					// break;
			// }
		// });
		
		// SocketConnection.on("keyup", function(data){
			// switch(data.key) {
				// case "to-left":
					// game.untriggerKey(37);
					// break;
				// case "to-right":
					// game.untriggerKey(39);
					// break;
				// case "action-2":
					// game.untriggerKey(38);
					// break;
			// }
		// });
	});
	
	self.SocketEmissor = (function(area){
		if (SocketConnection && isServer) {
			SocketConnection.emit("area", area);
		}
	});
	
	self.readServer = (function(){
		self.pause();
		
		SocketConnection.on("area", function(area){
			virtualContext.fillRect(0, 0, args.width, args.height);
			virtualContext.fillStyle = args.color;
			virtualContext.fill();
			
			for (var i in area) {
				if (area[i].who == "hero") {
					TheHero.setJumping(area[i].isJumping);
					TheHero.setFalling(area[i].isFalling);
					TheHero.setWalking(area[i].isWalking);
					TheHero.setLowered(area[i].isLowered);
					TheHero.setLoop(area[i].loop);
					if (area[i].isRight) { TheHero.setRight(); }
					if (area[i].isLeft) { TheHero.setLeft(); }
					area[i].loop
					draw(TheHero.getCurrentImage(), area[i].x, area[i].y);
				} else if (area[i].who == "helper") {
					TheHelper.setJumping(area[i].isJumping);
					TheHelper.setFalling(area[i].isFalling);
					TheHelper.setWalking(area[i].isWalking);
					TheHelper.setLowered(area[i].isLowered);
					TheHelper.setLoop(area[i].loop);
					if (area[i].isRight) { TheHelper.setRight(); }
					if (area[i].isLeft) { TheHelper.setLeft(); }
					draw(TheHelper.getCurrentImage(), area[i].x, area[i].y);
				} else {
					draw(self.getObject(area[i].who).getImage(), area[i].x, area[i].y);
				}
			}
			flush();
		});
		
		document.body.onkeydown = function(e){ 
			SocketConnection.emit("helperKeydown", { key: e.keyCode });
		}
		
		document.body.onkeyup = function(e){
			SocketConnection.emit("helperKeyup", { key: e.keyCode });
		}
	});
	
	self.runServer = (function(){
		var speed = 15; // quando pixels são movimentados cada vez que o personagem se move
		var fps = 60; // frames por segundo
		
		interval = setInterval(function(){
			//	limpando canvas virtual
			virtualContext.fillRect(0, 0, args.width, args.height);
			virtualContext.fillStyle = args.color;
			virtualContext.fill();
			
			//	definindo qual parte será exibida
			var fatia = map.getBetween(currentX - 200, currentX+self.realWidth() + 200);
			var createdIds = [];
			var env = new Environment();
			var HeroAction = heroKeyBoard.codeToAction(heroKey),
				HelperAction = helperKeyBoard.codeToAction(helperKey);
			
			//	ações do herói e de seu ajudante
			TheHero.setLowered(false); // se ele manter a tecla para baixo pressionada, o valor deste false será alterado
			if (HeroAction.indexOf("gojump") != -1) {
				TheHero.startJump();
			} else if (HeroAction.indexOf("golow") != -1) {
				if (!TheHero.isFalling() && !TheHero.isJumping()) {
					TheHero.setLowered(true);
				}
			}
			
			TheHelper.setLowered(false);
			if (HelperAction.indexOf("gojump") != -1) {
				TheHelper.startJump();
			} else if (HelperAction.indexOf("golow") != -1) {
				if (!TheHelper.isFalling() && !TheHelper.isJumping()) {
					TheHelper.setLowered(true);
				}
			}
			
			//	criando ambiente
			for (var x in fatia) {
				for (el in fatia[x]) {
					var element;
					if (fatia[x][el].type == "reference") {
						element = map.getReference(parseFloat(fatia[x][el].x), fatia[x][el].id);
						element.x = parseFloat(fatia[x][el].x);
					} else {
						element = fatia[x][el];
						element.x = x;
					}
					
					if (element.type == "object") {
						var el_id = "object-"+element.id;
						
						if (createdIds.indexOf(el_id) == -1) {
							createdIds[createdIds.length] = el_id;
							var y = (element.top != null) ? (element.top) : (map.bottomToY(element.bottom, element.object.getHeight()));

							env.addRectangle({
								id: el_id,
								x: element.x,
								y: y,
								width: element.object.getWidth(),
								height: element.object.getHeight(),
								attributes: {
									type: "object",
									object: element,
									id: element.id
								}
							});
						}
					} else if (element.type == "hero") {
						var y = (element.top != null) ? (element.top) : (map.bottomToY(element.bottom, TheHero.getHeight()));
						env.addRectangle({
							id: "hero",
							x: element.x,
							y: y,
							width: TheHero.getWidth(),
							height: TheHero.getHeight(),
							attributes: {
								type: "hero",
								object: TheHero,
								id: element.id
							}
						});
					} else if (element.type == "helper") {
						var y = (element.top != null) ? (element.top) : (map.bottomToY(element.bottom, TheHelper.getHeight()));
						env.addRectangle({
							id: "helper",
							x: element.x,
							y: y,
							width: TheHelper.getWidth(),
							height: TheHelper.getHeight(),
							attributes: {
								type: "helper",
								object: TheHelper,
								id: element.id
							}
						});
					}
				}
			}
			
			var rectangles = env.getRectangles();
			TheHero.setFalling(false);
			TheHelper.setFalling(false);
			for (var i in rectangles) {
				//	gravidade
				if (rectangles[i].attributes.object.fallable == true) {
					var gravidade = speed*2;
					var collision = env.willICollide(rectangles[i], "down", gravidade);
					var add = (collision.collision === false)?(gravidade):(collision.collision);
					
					if (add !== 0) { // ele não está caindo
						rectangles[i].move("down", add);
						if (rectangles[i].attributes.type == "hero") {
							TheHero.setFalling(true); // avidando que o herói está em queda, para que a sprite seja alterada
						} else if (rectangles[i].attributes.type == "helper") {
							TheHelper.setFalling(true);
						}
						
						map.move({
							id: rectangles[i].attributes.id,
							x: rectangles[i].getArea().x,
							addY: add
						});
					}
				}
				
				if (rectangles[i].attributes.type == "hero" || rectangles[i].attributes.type == "helper") {
					var type = rectangles[i].attributes.type;
					var ThePlayer = (type == "hero")?(TheHero):(TheHelper);
					var PlayerActions = (type == "hero")?(HeroAction):(HelperAction);
					
					//	salto
					if (ThePlayer.isJumping()) {
						var saltoSpeed = ThePlayer.getJumpSpeed(speed);
						var collision = env.willICollide(rectangles[i], "up", saltoSpeed);
						if (collision.collision !== 0 && collision.collision != saltoSpeed) {
							ThePlayer.addJump();
							var add = ((collision.collision == false)?(saltoSpeed):(collision.collision));
							
							rectangles[i].move("up", add);
							map.move({
								id: rectangles[i].attributes.id,
								x: rectangles[i].getArea().x,
								addY: -add
							});
						} else {
							ThePlayer.stopJump();
						}
					}
					
					//	movimentando para esquerda ou direita
					if (PlayerActions.indexOf("goright") != -1) {
						var collision = env.willICollide(rectangles[i], "right", speed);
						var add = (collision.collision === false)?(speed):(collision.collision);
						
						ThePlayer.setRight();
						ThePlayer.setWalking(true);
						map.move({
							id: rectangles[i].attributes.id,
							x: rectangles[i].getArea().x,
							addX: add
						});
						rectangles[i].move("right", add);
						if (type == "hero") { currentX += add; }
					} else if (PlayerActions.indexOf("goleft") != -1) {
						var collision = env.willICollide(rectangles[i], "left", speed);
						var add = (collision.collision === false)?(speed):(collision.collision);
						
						ThePlayer.setLeft();
						ThePlayer.setWalking(true);
						map.move({
							id: rectangles[i].attributes.id,
							x: rectangles[i].getArea().x,
							addX: -add
						});
						rectangles[i].move("left", add);
						if (type == "hero") { currentX -= add; }
					} else {
						ThePlayer.setWalking(false);
					}
				}
			}
			
			HeroAction = [];
			HelperAction = [];
			
			//	exibindo os retângulos na tela
			var rectangles = env.getRectangles();
			var toEmit = [];
			for (var i in rectangles) {
				var area = rectangles[i].getArea();
				if (rectangles[i].attributes.type == "hero" || rectangles[i].attributes.type == "helper") {
					var player = (rectangles[i].attributes.type == "hero")?(TheHero):(TheHelper);
					draw(rectangles[i].attributes.object.getCurrentImage(), area.x - currentX, area.y);
					toEmit[toEmit.length] = {
						y: rectangles[i].getArea().y,
						x: rectangles[i].getArea().x  - currentX,
						who: rectangles[i].attributes.type,
						isJumping: player.isJumping(),
						isFalling: player.isFalling(),
						isWalking: player.isWalking(),
						isLowered: player.isLowered(),
						isRight: player.isRight(),
						isLeft: player.isLeft(),
						loop: player.getLoop()
					};
				} else if (rectangles[i].attributes.type == "object") {
					draw(self.getObject(map.getItem(rectangles[i].attributes.object.id, area.x).name).getImage(), area.x - currentX, area.y);
					toEmit[toEmit.length] = {
						y: rectangles[i].getArea().y,
						x: rectangles[i].getArea().x  - currentX,
						who: map.getItem(rectangles[i].attributes.object.id, area.x).name
					};
				}
			}
			
			self.SocketEmissor(toEmit);

			flush();
		}, fps);
	});
	
	self.pause = (function(){
		clearInterval(interval);
	});
	
	self.createServer = (function(idgame, password, callback){
		if (password == null) { password = false; }
		if (callback == null) { callback = function(){}; }
		
		if (SocketConnection) {
			SocketConnection.on("doServerCallback", function(data){
				isServer = true;
				callback(data.status);
			});
			SocketConnection.emit("doServer", { idgame: idgame, password: idgame });
			
			SocketConnection.on("helperConnected", function(){
				map.setHelper(currentX+100);
			});
		} else {
			callback("offline");
		}
	});
	
	self.joinServer = (function(idgame, password, callback){
		if (password == null) { password = false; }
		if (callback == null) { callback = function(){}; }
		
		if (SocketConnection) {
			SocketConnection.on("doJoinCallback", function(data){
				self.readServer();
				callback(data.status);
			});
			SocketConnection.emit("doJoin", { idgame: idgame, password: password });
		} else {
			callback("offline");
		}
	});
	
	//	classes privadas
	var KeyBoard = (function(args){
		if (args == null) { args = {}; }
		if (args.right == null) { args.right = 39; }
		if (args.left == null) { args.left = 37; }
		if (args.down == null) { args.down = 40; }
		if (args.up == null) { args.up = 38; }
		if (args.special == null) { args.special = []; }
		
		var self = this;
		var keys = [];
		var actions = [];
		
		self.goright = args.right;
		self.goleft = args.left;
		self.golow = args.down;
		self.gojump = args.up;
		
		var __construct = (function(args){
			keys[keys.length] = args.right;
			actions[args.right] = "goright";
			
			keys[keys.length] = args.left;
			actions[args.left] = "goleft";
			
			keys[keys.length] = args.down;
			actions[args.down] = "golow";
			
			keys[keys.length] = args.up;
			actions[args.up] = "gojump";
			
			for (i in args.special) {
				keys[keys.length] = args.special[i].key;
				actions[args.special[i].key] = args.special[i].name;
			}
		});
		
		self.getKeys = (function(){
			return keys;
		});
		
		self.codeToAction = (function(code){
			var acoes = []
			for (var i in code) {
				acoes[acoes.length] = actions[code[i]]
			}
			return acoes;
		});
		
		self.isMine = (function(code){
			if (keys.indexOf(code) != -1) {
				return true;
			}
			return false;
		});
		
		__construct(args);
	});
	
	var Map = (function(args){
		//	defaults
		if (args == null) { throw new Exception("can't create map", "args.x"); return false; }
		if (args.x == null) { throw new Exception("can't create map", "args.x"); return false; }
		if (args.onload == null) { args.onload = function(){}; }
		
		//	atributos
		var self = this;
		var map = [];
		var index = []; // indice de pesquisa do mapa
		var game;
		var currentId = 0;
		
		var __construct = (function(args){
			game = args.game;
			
			for (var i in args.x) {
				if (isNaN(i) || !args.x[i] instanceof Array) {
					throw new Exception("your map can't be loaded because you're using something that's not a number as index in the json, used index: " + i);
					return false;
				} else {
					if (map[i] == null) { map[i] = []; }
					for (var j in args.x[i]) {
						var current = map[i].length;
						map[i][current] = args.x[i][j];
						map[i][current].id = newId();
						map[i][current].object = game.getObject(map[i][current].name);
						if (map[i][current].type == "object") { // cria referencias do objeto no mapa caso ele ultrapasse o tamanho do canvas virtual
							if (game.getObject(map[i][current].name).getWidth() > game.realWidth() / 100 * 75) {
								for (var k = (game.realWidth() / 100 * 75); k <= game.getObject(map[i][current]).width(); k += (game.realWidth() / 100 * 75)) {
									var x = parseFloat(i) + k;
									if (map[x] == null) { map[x] = []; }
									
									map[x][map[x].length] = {
										type: "reference",
										x: i,
										id: map[i][current].id
									}
								}
							}
							
							var x = parseFloat(i) + game.getObject(map[i][current].name).getWidth();
							if (map[x] == null) { map[x] = []; }
							
							map[x][map[x].length] = {
								type: "reference",
								x: i,
								id: map[i][current].id
							};
						} else if (map[i][current].type == "hero") {
							map[i][current].top = (map[i][current].top != null) ? (map[i][current].top) : (self.bottomToY(map[i][current].bottom, TheHero.getHeight()));
							map[i][current].object = TheHero;
						} else if (map[i][current].type != "monster") {
							throw new Exception("unknown type '"+args.x[i].type+"', won't compile map.");
							return false;
						}
					}
				}
			}
			
			for (var i in map) {
				index[index.length] = parseFloat(i);
			}
			
			args.onload(self);
			return true;
		});
		
		var newId = (function(){
			return (currentId++);
		});
		
		/** busca um indice de X atraves do valor de X, se esse valor não for encontrado, ele busca pelo
		elemento mais proximo a posição X dada para a esquerda */
		var minSelect = (function(find, xstart, xend){
			if (xstart == null) { xstart = 0; }
			if (xend == null) { xend = index.length - 1; }
			
			var xmiddle = (xend - xstart) / 2 + xstart;
			if (parseFloat(index[Math.floor(xmiddle)]) <= find && find < parseFloat(index[Math.ceil(xmiddle)])) {
				return Math.floor(xmiddle);
			} else if (find == parseFloat(index[Math.ceil(xmiddle)])) {
				return Math.ceil(xmiddle);
			} else if (find == parseFloat(index[Math.floor(xmiddle)])) {
				return Math.floor(xmiddle);
			} else if (index[xstart] < find && find < index[Math.ceil(xmiddle)]) {
				return minSelect(find, xstart, Math.ceil(xmiddle));
			} else if (index[Math.ceil(xmiddle)] < find && find < index[xend]) {
				return minSelect(find, Math.ceil(xmiddle), xend);
			} else if (parseFloat(index[xstart]) >= find) {
				return xstart;
			} else if (parseFloat(index[xend]) <= find) {
				return xend;
			} else {
				throw new Exception("can't find element in map");
				return false;
			}
		});
		
		/** busca um indice de X atraves do valor de X, se esse valor não for encontrado, ele busca pelo
		elemento mais proximo a posição X dada para a direita */
		var maxSelect = (function(find, xstart, xend){
			if (xstart == null) { xstart = 0; }
			if (xend == null) { xend = index.length - 1; }
			
			var xmiddle = (xend - xstart) / 2 + xstart;
			if (parseFloat(index[Math.floor(xmiddle)]) < find && find <= parseFloat(index[Math.ceil(xmiddle)])) {
				return Math.ceil(xmiddle);
			} else if (find == parseFloat(index[Math.floor(xmiddle)])) {
				return Math.floor(xmiddle);
			} else if (find == parseFloat(index[Math.ceil(xmiddle)])) {
				return Math.ceil(xmiddle);
			} else if (index[xstart] < find && find < index[Math.ceil(xmiddle)]) {
				return maxSelect(find, xstart, Math.ceil(xmiddle));
			} else if (index[Math.ceil(xmiddle)] < find && find < index[xend]) {
				return maxSelect(find, Math.ceil(xmiddle), xend);
			} else if (parseFloat(index[xstart]) >= find) {
				return xstart;
			} else if (parseFloat(index[xend]) <= find) {
				return xend;
			} else {
				throw new Exception("can't find element in map");
				return false;
			}
		});
		
		/** busca um indice de X atraves do valor de X, o valor de X deve ser exato. */
		var doSelect = (function(find, xstart, xend){
			if (xstart == null) { xstart = 0; }
			if (xend == null) { xend = index.length - 1; }
			
			var xmiddle = (xend - xstart) / 2 + xstart;
			if (xmiddle % 1 != 0) {
				if (xend - xstart == 1) {
					if (parseFloat(index[Math.ceil(xmiddle)]) == find) {
						return Math.ceil(xmiddle);
					} else if (parseFloat(index[Math.floor(xmiddle)]) == find) {
						return Math.floor(xmiddle);
					} else {
						return false;
					}
				} else if (parseFloat(index[xstart]) <= find && find <= parseFloat(index[Math.ceil(xmiddle)])) {
					return doSelect(find, xstart, Math.ceil(xmiddle));
				} else if (parseFloat(index[Math.floor(xmiddle)]) < find && find <= parseFloat(index[xend])) {
					return doSelect(find, Math.floor(xmiddle), xend);
				} else {
					return false;
				}
			} else if (parseFloat(index[xmiddle]) == find) {
				return xmiddle;
			} else if (parseFloat(index[xstart]) <= find && find <= parseFloat(index[xmiddle])) {
				return doSelect(find, xstart, xmiddle);
			} else if (parseFloat(index[xmiddle]) < find && find <= parseFloat(index[xend])) {
				return doSelect(find, xmiddle, xend);
			} else {
				return false;
			}
		});
		
		self.getBetween = (function(from, to){
			var xfrom = maxSelect(from);
			var xto = minSelect(to);
			var fatia = [];
			for (var i = parseFloat(xfrom); i <= parseFloat(xto); i++) {
				fatia[index[i]] = map[index[i]];
			}
			
			return fatia;
		});
		
		self.getReference = (function(x, id){
			for (var i in map[x]) {
				if (map[x][i].id == id && map[x][i].type != "reference") {
					return map[x][i];
				}
			}
			
			return {};
		});
		
		var addX = (function(x, el){
			if (map[x] == null) {
				map[x] = [];
				index[index.length] = x;
			}
			
			map[x][map[x].length] = el;
			sort();
		});
		
		self.setHelper = (function(x){
			addX(x, {
				top: 0,
				x: x,
				type: "helper",
				object: TheHelper,
				id: newId()
			});

			return true;
		});
		
		var removeX = (function(x, id){
			var content;
			if (map[x] == null) { throw new Exception("you must know exactly the element's x position and id"); }
			var indice;
			for (var i in map[x]) {
				if (map[x][i].id == id) {
					indice = parseFloat(i);
					break;
				}
			}
			
			content = map[x].splice(indice, 1);
			if (map[x].length == 0) {
				map[x] = null;
				
				// map.splice(parseFloat(x), 1);
				index.splice(doSelect(x), 1);
			}
			
			return content[0];
		});
		
		self.move = (function(args){
			if (args == null) { throw new Exception("haven't much information to get item", ["args.id", "args.x"]); return false; }
			if (args.id == null) { throw new Exception("can't find element without id information", "args.id"); return false; }
			if (args.x == null) { throw new Exception("can't find element without x information", "args.x"); return false; }
			if (args.addX == null) { args.addX = 0; }
			if (args.addY == null) { args.addY = 0; }
			
			var element = removeX(args.x, args.id);
			element.top += args.addY;
			addX(parseFloat(args.x) + args.addX, element);
		});
		
		self.getItem = (function(id, x){
			if (id == null) { throw new Exception("you can't get the map element without it id", "id"); }
			if (x == null) { throw new Exception("you can't get the map element without it x position", "x"); }
			
			for (var i in map[x]) {
				if (map[x][i].id == id) {
					return map[x][i];
				}
			}
			
			throw new Exception("can't find element in map, use this method just if you sure about the element id and x position");
			return false;
		});
		
		self.bottomToY = (function(bottom, height) {
			return game.realHeight() - (bottom + height);
		});
		
		var sort = (function(){
			index.sort(function(a,b){ return a - b; });
		});
		
		if (!__construct(args)) { return false; }
	});
	
	var Monster = (function(args){
		//	defaults
		if (args == null) { throw new Exception("you can't create a monster without a name", "args.name"); return false; }
		if (args.name == null) { throw new Exception("you can't create a monster without a name", "args.name"); return false; }
		
		var self = this;
		var __construct = (function(args){
			
		});
		
		__construct(args);
	});
	
	var Power = (function(args){
		if (args == null) { throw new Exception("missing argument 'args' to create a power", "args.name"); return false; }
		if (args.name == null) { throw new Exception("missing argument 'args.name' to create a power", "args.name"); return false; }
		
		var self = this;
		var reserved = ["doleft", "doright", "gojump", "golow"];
		
		var __construct = (function(args){
			if (reserved.indexOf(args.name) != -1) {
				throw new Exception("you can't create a power called '"+args.name+"', this name is reserved.");
				return false;
			}
		});
		
		if (!__construct(args)) { return false; }
	});
	
	var ImageLoader = (function(args){
		if (args == null) { throw new Exception("haven't any sense you call this class if you don't give any image to load", "args.image"); }
		if (args.images == null) { throw new Exception("haven't any sense you call this class if you don't give any image to load", "args.images"); }
		// if (args.image.base == null)    parametros possíveis
		// if (args.image.jumping == null) parametros possíveis
		// if (args.image.falling == null) parametros possíveis
		// if (args.image.walking == null) parametros possíveis
		// if (args.image.lowered == null) parametros possíveis
		if (args.onload == null) { args.onload = (function(){}); }
		
		//	atributos
		var self = this;
		var loadeds = 0; // images already loaded
		var imagesTotal = 0; // total of images to load
		
		var base = { };
		var jumping = { };
		var falling = { };
		var walking = { };
		var lowered = { };
		
		var __construct = (function(args){
			base = loadImg((args.images.base)?(args.images.base):(args.images));
			jumping = (args.images.jumping) ? (loadImg(args.images.jumping)) : (base);
			falling = (args.images.falling) ? (loadImg(args.images.falling)) : (base);
			walking = (args.images.walking) ? (loadImg(args.images.walking)) : (base);
			lowered = (args.images.lowered) ? (loadImg(args.images.lowered)) : (base);
			loading();
		});
		
		var loadImg = (function(from){
			var imgs = {};
			
			//	caso a imagem seja um string
			if (typeof from == "string") {
				imagesTotal++;
				imgs.left = [new Image()];
				imgs.left[0].onload = loading;
				imgs.left[0].src = from;
				imgs.right = imgs.left;
			
			//	caso a imagem seja um json no padrão { left:"", right:"" }
			} else if (typeof from == "object" && from.right != null && from.left != null) {
				//	esquerda
				if (typeof from.left == "string") {
					imagesTotal++;
					imgs.left = [new Image()];
					imgs.left[0].onload = loading;
					imgs.left[0].src = from.left;
				} else if (from.left instanceof Array) {
					imgs.left = [];
					for (var img in from.left) {
						if (typeof from.left[img] == "string") {
							imagesTotal++;
							var indice = imgs.left.length;
							imgs.left[indice] = new Image();
							imgs.left[indice].onload = loading;
							imgs.left[indice].src = from.left[img];
						} else {
							throw new Exception("can't load image, the given argument is invalid");
						}
					}
				} else {
					throw new Exception("can't load image, the given argument is invalid");
				}
				
				//	direitra
				if (typeof from.right == "string") {
					imagesTotal++;
					imgs.right = [new Image()];
					imgs.right[0].onload = loading;
					imgs.right[0].src = from.right;
				} else if (from.right instanceof Array) {
					imgs.right = [];
					for (var img in from.right) {
						if (typeof from.right[img] == "string") {
							imagesTotal++;
							var indice = imgs.right.length;
							imgs.right[indice] = new Image();
							imgs.right[indice].onload = loading;
							imgs.right[indice].src = from.right[img];
						} else {
							throw new Exception("can't load image, the given argument is invalid");
						}
					}
				} else {
					throw new Exception("can't load image, the given argument is invalid");
				}
			
			//	caso seja uma array
			} else if (from instanceof Array) {
				imgs.left = [];
				for (var img in from) {
					if (typeof from[img] == "string") {
						imagesTotal++;
						var indice = imgs.left.length;
						imgs.left[indice] = new Image();
						imgs.left[indice].onload = loading;
						imgs.left[indice].src = from[img];
					} else {
						throw new Exception("can't load image, the given argument is invalid");
					}
				}
				imgs.right = imgs.left;
			} else {
				throw new Exception("can't load image, the given argument is invalid");
			}
			
			return imgs;
		});
		
		var loading = (function(){
			loadeds++;
			if (imagesTotal < loadeds) {
				args.onload();
			}
		});
		
		self.getCurrentImage = (function(args){
			if (args == null) { args = {}; }
			if (args.loop == null) { args.loop = 1; }
			
			if (args.isJumping) {
				if (args.isRight) {
					return jumping.right[args.loop % jumping.right.length];
				} else {
					return jumping.left[args.loop % jumping.left.length];
				}
			} else if (args.isFalling) {
				if (args.isRight) {
					return falling.right[args.loop % falling.right.length];
				} else {
					return falling.left[args.loop % falling.left.length];
				}
			} else if (args.isWalking) {
				if (args.isRight) {
					return walking.right[args.loop % walking.right.length];
				} else {
					return walking.left[args.loop % walking.left.length];
				}
			} else if (args.isLowered) {
				if (args.isRight) {
					return lowered.right[args.loop % lowered.right.length];
				} else {
					return lowered.left[args.loop % lowered.left.length];
				}
			} else {
				if (args.isRight) {
					return base.right[args.loop % base.right.length];
				} else {
					return base.left[args.loop % base.left.length];
				}
			}
		});
		
		__construct(args);
	});
	
	var HeroForm = (function(args){
		//	defaults
		if (args == null) { throw new Exception("you can't create a hero form without a name", "args.name"); return false; }
		if (args.name == null) { throw new Exception("you can't create a hero form without a name", "args.name"); return false; }
		if (args.images == null) { throw new Exception("the hero form must have a base image", "args.images"); return false; }
		if (args.jumpMaxSize == null || args.jumpMaxSize == 0) { args.jumpMaxSize = 12; }
		if (args.onload == null) { args.onload = (function(){}); }
		if (args.height == null) { args.height = false; } 
		if (args.width == null) { args.width = false; } 
		
		//	classe pai
		ImageLoader.call(this, args);
		
		//	atributos
		var self = this;
		var width = false;
		var height = false;
		
		//	metodos
		var __construct = (function(args){
			width = args.width;
			height = args.height;
		});
		
		self.getJumpMaxSize = (function(){
			return args.jumpMaxSize;
		});
		
		self.getHeight = (function(args){
			if (height) {
				return height;
			} else {
				self.getCurrentImage(args).height;
			}
		});
		
		self.getWidth = (function(args){
			if (width) {
				return width;
			} else {
				self.getCurrentImage(args).width;
			}
		});
		
		__construct(args);
	});
	
	var Player = (function(args){
		if (args == null) { throw new Exception("can't create hero without an form", "args.form"); }
		if (args.form == null) { throw new Exception("can't create hero without an form", "args.form"); }
		
		var self = this;
		var isJumping = false; // Verifica se o jogador está executando um salto
		var isFalling = false; // Verifica se o jogador está caindo
		var isWalking = false; // Verifica se o jogador está caminhando
		var isLowered = false; // Verifica se o jogador está abaixado
		
		var hasJumped = 0; // Expressa a quantidade de altura que o personagem já pulou
		
		var isRight = true;	// guarda a informações sobre o personagem estar virado para a direita
		var isLeft = false;
		var keyBoard;
		
		var form;	// forma do player
		var loop = 0; // quando a animação do personagem é composta por varias imagens, esse atributo mostra em qual loop a imagem está
		var game; // O objeto do jogo
		
		self.fallable = true;

		var __construct = (function(args){
			game = args.game;
			form = args.form;
		});
		
		self.isNormal = (function(){ 
			return (!isJumping && !isFalling && !isWalking && !isLowered);
		});
		
		self.isJumping = (function(){ return isJumping; });
		
		self.isFalling = (function(){ return isFalling; });
		
		self.isWalking = (function(){ return isWalking; });
		
		self.isLowered = (function(){ return isLowered; });

		self.getLoop = (function(){ return loop; });
		
		self.isRight = (function(){ return isRight; });
		
		self.isLeft = (function(){ return isLeft; });
		
		self.setJumping = (function(is){
			if (is) {
				isJumping = true;
				self.setWalking(false);
			} else {
				isJumping = false;
			}
		});
		
		self.setFalling = (function(is){
			if (is) {
				isFalling = true;
				self.setWalking(false);
			} else {
				isFalling = false;
			}
		});
		
		self.setLowered = (function(is){
			if (is) {
				isLowered = true;
				self.setWalking(false);
			} else {
				isLowered = false;
			}
		});
		
		self.setWalking = (function(is){
			if (is && !isJumping && !isLowered && !isFalling) {
				isWalking = true;
				loop++;
			} else {
				isWalking = false;
				loop = 0;
			}
		});
		
		self.setLoop = (function(lp){
			if (!isNaN(lp)) { loop = lp; }
		});
		
		self.setRight = (function(){
			isRight = true;
			isLeft = false;
		});
		
		self.setLeft = (function(){
			isRight = false;
			isLeft = true;
		});
		
		self.changeForm = (function(newform){
			form = newform;
		});

		self.receiveInformation = (function(code){
			return self.keyBoard.codeToAction(code);
		});
		
		self.setKeyBoard = (function(args){
			if (typeof args == "object" && args instanceof KeyBoard) {
				keyBoard = args;
				return keyBoard;
			} else if (typeof args == "object") {
				keyBoard = new KeyBoard(args);
				return keyBoard;
			} else {
				throw new Exception("Invalid argument given to create player keyboard");
				return false;
			}
		});
		
		self.getCurrentImage = (function(){
			return game.getHeroForm(form).getCurrentImage({
				isWalking: isWalking,
				isLowered: isLowered,
				isJumping: isJumping,
				isFalling: isFalling,
				isRight: isRight,
				loop: loop
			}); 
		});
		
		self.getHeroForm = (function(){
			return game.getHeroForm(form);
		});
		
		self.getHeight = (function(){
			return game.getHeroForm(form).getHeight({
				isWalking: isWalking,
				isLowered: isLowered,
				isJumping: isJumping,
				isFalling: isFalling,
				loop: loop
			});
		});
		
		self.getWidth = (function(){
			return game.getHeroForm(form).getWidth({
				isWalking: isWalking,
				isLowered: isLowered,
				isJumping: isJumping,
				isFalling: isFalling,
				loop: loop
			});
		});
		
		self.getJumpSpeed = (function(baseSpeed){
			baseSpeed *= 2.25;
			baseSpeed = parseFloat(baseSpeed.toString().split(".")[0]);
			baseSpeed /= self.getHeroForm().getJumpMaxSize();
			baseSpeed = baseSpeed*(self.getHeroForm().getJumpMaxSize()-hasJumped);
			return baseSpeed;
		});
		
		self.startJump = (function(){
			if (!isJumping && !isFalling) {
				self.fallable = false;
				isJumping = true;
				self.setWalking(false);
			}
		});
		
		self.addJump = (function(){
			if (isJumping) {
				hasJumped++;
				if (hasJumped == self.getHeroForm().getJumpMaxSize()) {
					self.stopJump();
				}
			}
			
			return isJumping;
		});
		
		self.stopJump = (function(){
			isJumping = false; // não esta pulando, variavel que influencia nas sprites
			hasJumped = 0; // reseta a quantidade de espaços que pulou
			self.fallable = true; // caivel
			isFalling = true;
		});
		
		__construct(args);
	});
	
	var Hero = (function(args){
		//	extends
		Player.call(this, args);
		
		//	atributos
		var self = this;
		
		//	metodos
		var __construct = (function(args){
			self.setKeyBoard(heroKeyBoard);
		});
		
		__construct(args);
	});
	
	var Helper = (function(args){
		//	extends
		Player.call(this, args);
		
		//	atributos
		var self = this;
		
		//	metodos
		var __construct = (function(args){
			self.setKeyBoard(helperKeyBoard);
		});
		
		__construct(args);
	});
	
	var Object = (function(args){
		//	defaults
		if (args == null) { throw new Exception("you can't create an object without a name", "args.name"); return false; }
		if (args.name == null) { throw new Exception("you can't create an object without a name", "args.name"); return false; }
		if (args.images == null) { throw new Exception("can't create object without the base image", "args.image"); }
		if (args.onload = null) { args.onload = (function(){}); }
		
		//	class pai
		ImageLoader.call(this, args);
		
		//	atributos
		var self = this;
		var isRight = false;
		var isLeft = false;
		var isFalling = false;
		var isJumping = false;
		var isLowered = false;
		var isWalking = false;
		
		self.fallable = args.fallable || false;
		
		//	métodos
		var __construct = (function(args){

		});
		
		self.getWidth = (function(){
			return Math.floor(self.getImage().width);
		});
		
		self.getHeight = (function(){
			return Math.floor(self.getImage().height);
		});
		
		self.getImage = (function(){
			return self.getCurrentImage({
				isRight: isRight,
				isLeft: isLeft,
				isFalling: isFalling,
				isJumping: isJumping,
				isLowered: isLowered,
				isWalking: isWalking
			});
		});

		__construct(args);
	});

	__construct(args);
});

var Environment = (function(args){
	var self = this;
	var rectangles = [];
	
	self.addRectangle = (function(args){
		if (args == null) { throw new Exception("can't create rectangle widthout id", "args.id"); return false; }
		if (args.id == null) { throw new Exception("can't create rectangle widthout id", "args.id"); return false; }
		
		rectangles[args.id] = new Rectangle(args);
		return rectangles[args.id];
	});
	
	self.doCollides = (function(rectangle){
		var rectangle = toRectangle(rectangle);
		var collisions = [];
		for (var i in rectangles) {
			if (rectangles[i].id != rectangle.id && rectangles[i].rectangleIsCrossed(rectangle)) {
				collisions[collisions.length] =  rectangles[i];
			}
		}
		
		return collisions;
	});
	
	self.willICollide = (function(rectangle, to, speed){
		var rectangle = toRectangle(rectangle);
		var area = {
			x: rectangle.getArea().x,
			y: rectangle.getArea().y,
			width: rectangle.getArea().width,
			height: rectangle.getArea().height
		};
		
		switch (to) {
			case "up":	
				area.y -= speed;
				break;
				
			case "down":
				area.y += speed;
				break;
				
			case "left":
				area.x -= speed;
				break;
				
			case "right":
				area.x += speed;
				break;
		}
		
		var antigos = self.doCollides(rectangle);
		var futuro = self.doCollides({
			id: rectangle.id,
			x: area.x,
			y: area.y,
			width: area.width,
			height: area.height
		});
		
		var indices = []; // vamos ver quais eram os retângulos que já estavam colidindo antes
		var retangulos = [];
		for (var z in antigos) {
			indices[indices.length] = antigos[z].id;
		}
		
		var collision = 0;
		for (var z in futuro) { // verificando novas colisões
			if (indices.indexOf(futuro[z].id) == -1) {
				retangulos[retangulos.length] = futuro[z];
				
				switch(to) {
					case "up":
						var essacolisao = rectangle.getArea().y - (futuro[z].getArea().y + futuro[z].getArea().height);
						break;
						
					case "down":
						var essacolisao = futuro[z].getArea().y - (rectangle.getArea().y + rectangle.getArea().height);
						break;
						
					case "left":
						var essacolisao = rectangle.getArea().x - (futuro[z].getArea().x + futuro[z].getArea().height);
						break;
						
					case "right":
						var essacolisao = futuro[z].getArea().x - (rectangle.getArea().x + rectangle.getArea().height);
						break;
				}
				
				if (essacolisao > collision) {
					collision = essacolisao;
				}
			}
		}
		
		return {
			rectangles: retangulos,
			collision: (retangulos.length!=0)?collision:false
		};
	});
	
	self.getRectangle = (function(id){
		return rectangles[id];
	});
	
	self.getRectangles = (function(){
		return rectangles;
	});
	
	var toRectangle = (function(args){
		if (typeof args == "string" && rectangles[args] instanceof Rectangle) {
			return rectangles[args];
		} else if (args instanceof Rectangle) {
			return args;
		} else if (typeof args == "object" && args.x != null && args.y != null && args.height != null && args.width != null) {
			return new Rectangle(args);
		} else {
			throw new Exception("can't detect collision: invalid argument given");
			return false;
		}
	});
	
	var Rectangle = (function(args){
		//	defaults
		if (args == null) { throw new Exception("can't create rectangle without any argument", "args"); return false; }
		if (args.x == null) { throw new Exception("can't create rectangle without x position", "args.x"); return false; }
		if (args.y == null) { throw new Exception("can't create rectangle without y position", "args.y"); return false; }
		if (args.width == null) { throw new Exception("can't create rectangle without width", "args.width"); return false; }
		if (args.height == null) { throw new Exception("can't create rectangle without height", "args.height"); return false; }
		
		var self = this;
		var area;
		
		var __construct = (function(args){
			area = {
				x: parseFloat(args.x),
				y: parseFloat(args.y),
				width: parseFloat(args.width),
				height: parseFloat(args.height)
			};
			
			if (args.id) {
				self.id = args.id;
			}
			
			if (args.attributes != null) {
				self.attributes = args.attributes;
			} else {
				args.attributes = {};
			}
		});
		
		self.pointIsInside = (function(point){
			if (area.x < point.x && area.y < point.y && point.x < (area.x + area.width) && point.y < (area.y + area.height)) {
				return true;
			} else {
				return false;
			}
		});
		
		self.rectangleIsCrossed = (function(rectangle){
			var foreign = toRectangle(rectangle).getArea();
			if (self.pointIsInside({ x: foreign.x, y: foreign.y }) || self.pointIsInside({ x: (foreign.x + foreign.width), y: foreign.y }) || self.pointIsInside({ x: foreign.x, y: (foreign.y + foreign.height) }) || self.pointIsInside({ x: (foreign.x + foreign.width), y: (foreign.y + foreign.height) })) {
				return true;
			} else if (rectangle.pointIsInside({ x: area.x, y: area.y }) || rectangle.pointIsInside({ x: (area.x + area.width), y: area.y }) || rectangle.pointIsInside({ x: area.x, y: (area.y + area.height) }) || rectangle.pointIsInside({ x: (area.x + area.width), y: (area.y + area.height) })) {
				return true;
			} else if (area.y <= foreign.y && (area.y + area.height) <= (foreign.y + foreign.height) && area.x >= foreign.x && (area.x + area.width) <= (foreign.x + foreign.width)) {
				return true;
			} else if (area.x <= foreign.x && (area.x + area.width) <= (foreign.x + foreign.width) && area.y >= foreign.y && (area.y + area.height) <= (foreign.y + foreign.height)) {
				return true;
			} else {
				return false;
			}
		});
		
		self.getArea = (function(){
			return area;
		});
		
		self.move = (function(tos, qtdd){
			if (typeof tos == "string") {
				move(tos, qtdd);
			} else if (tos instanceof Array) {
				for (var i in tos) {
					move(tos[i], qtdd);
				}
			} else {
				throw new Exception("invalid argument 'args.tos' given");
			}
		});
		
		var move = (function(to, qtdd){
			if (qtdd == null) { qtdd = 1; }
			
			switch(to) {
				case "right":
					area.x += qtdd;
					break;
				case "up":
					area.y -= qtdd;
					break;
				case "left":
					area.x -= qtdd;
					break;
				case "down":
					area.y += qtdd;
					break;
			}
		});
		
		__construct(args);
	});
});

var Exception = (function(error, arg){
	var self = this;
	
	self.toString = (function(){	
		if (typeof arg == "object" && arg instanceof Array) {
			var end = arg.splice(arg.length - 1, 1);
			arg = arg.join(", ");
			if (arg != "") {
				arg += " e "+end[0];
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