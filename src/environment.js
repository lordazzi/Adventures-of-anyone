var Environment = (function(args){
	var self = this;
	var rectangles = [];
	
	self.addRectangle = (function(args){
		if (args == null) { throw new Exception("can't create rectangle widthout id", "args.id"); return false; }
		if (args.id == null) { throw new Exception("can't create rectangle widthout id", "args.id"); return false; }
		
		rectangles[args.id] = new Rectangle(args);
		return rectangles[args.id];
	});
	
	self.doCollides = (function(args){
		var rectangle;
		if (typeof args == "string") {
			rectangle = rectangles[args];
		} else if (typeof args == "object" && args.x != null && args.y != null && args.height != null && args.width != null) {
			rectangle = new Rectangle(args);
		} else if (args instanceof Rectangle) {
			rectangle = args;
		} else {
			throw new Exception("can't detect collision: invalid argument given");
			return false;
		}
		
		var collisions = [];
		for (var i in rectangles) {
			if (rectangles[i].rectangle.isCrossed(rectangle) && rectangles[i].id != rectangle.id) {
				collisions[collisions.length] = {
					rectangle: rectangles[i],
					types: rectangles[i].rectangle.getCollisionType(rectangle)
				};
			}
		}
		
		return collisions;
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
			}
			
			if (args.id) {
				self["id"] = args.id;
			}
			
			if (args.attributes != null) {
				self.attributes = args.attributes;
			}
		});
		
		self.point = {
			isInside: (function(point){
				if (area.x <= point.x && area.y <= point.y && (area.x + area.width) >= point.x && (area.y + area.height) >= point.y) {
					return true;
				} else {
					return false;
				}
			})
		}
		
		self.rectangle = {
			isInside: (function(rectangle){
				var foreign = rectangle.getArea();
				if (self.point.isInside({ x: foreign.x, y: foreign.y }) && self.point.isInside({ x: foreign.x + foreign.width, y: foreign.y  + foreign.height })) {
					return true;
				} else {
					return false;
				}
			}),
			isCrossed: (function(rectangle){
				var foreign = rectangle.getArea();
				if (self.point.isInside({ x: foreign.x, y: foreign.y }) || self.point.isInside({ x: (foreign.x + foreign.width), y: foreign.y }) || self.point.isInside({ x: foreign.x, y: (foreign.y + foreign.height) }) || self.point.isInside({ x: (foreign.x + foreign.width), y: (foreign.y + foreign.height) })) {
					return true;
				} else if (rectangle.point.isInside({ x: area.x, y: area.y }) || rectangle.point.isInside({ x: (area.x + area.width), y: area.y }) || rectangle.point.isInside({ x: area.x, y: (area.y + area.height) }) || rectangle.point.isInside({ x: (area.x + area.width), y: (area.y + area.height) })) {
					return true;
				} else if (area.y <= foreign.y && (area.y + area.height) <= (foreign.y + foreign.height) && area.x >= foreign.x && (area.x + area.width) <= (foreign.x + foreign.width)) {
					return true;
				} else if (area.x <= foreign.x && (area.x + area.width) >= (foreign.x + foreign.width) && area.y >= foreign.y && (area.y + area.height) >= (foreign.y + foreign.height)) {
					return true;
				} else {
					return false;
				}
			}),
			getCollisionType: (function(collisor){
				var types = [];
				var foreign = collisor.getArea();
				
				if ((foreign.x + foreign.width) < area.x) {
					types[types.length] = "left";
				} else if ((area.x + area.width) < foreign.x) {
					types[types.length] = "right";
				}
				
				if ((foreign.y + foreign.height) < area.y) {
					types[types.length] = "top";
				} else if ((area.y + area.height) < (foreign.y + foreign.height)) {
					types[types.length] = "bottom";
				}
				
				if (self.rectangle.isCrossed(collisor)) {
					types[types.length] = "bumped";
				}
				
				return types;
			})
		}
		
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
				case "left":
					area.x -= qtdd;
					break;
				case "up":
					area.y -= qtdd;
					break;
				case "right":
					area.x += qtdd;
					break;
				case "down":
					area.y += qtdd;
					break;
			}
		});
		
		__construct(args);
	});
});