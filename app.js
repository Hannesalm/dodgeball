var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

server.listen(2000);
console.log('Server is running...');

var mysql = require('mysql');

var db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'mmo',
	password: 'ppt8ue'
});

// Log any errors connected to the db
db.connect(function(err){
    if (err) console.log(err)
});

var SOCKET_LIST = {};

var Entity = function(param) {
	var self = {
		x:Math.random() * 500,
		y:Math.random() * 500,
		spdX:0,
		spdY:0,
		id:"",
		map: 'forest'
	};
	if(param){
		if(param.x)
			self.x = param.x;
		if(param.y)
			self.y = param.y;
		if(param.map)
			self.map = param.map;
		if(param.id)
			self.id = param.id;
	}

	self.update = function() {
		self.updatePosition();
	};
	
	self.updatePosition = function () {
		self.x += self.spdX;
		self.y += self.spdY;
	};

	self.getDistance = function (pt) {
		return Math.sqrt( Math.pow((self.x-pt.x), 2) + Math.pow((self.y-pt.y), 2) );
    };

	return self;
};

//Players
var Player = function (param) {
	var self = Entity(param);
	self.number = "" + Math.floor(10 * Math.random());
	self.username = param.username;
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngel = 0;
	self.maxSpd = 10;
	self.hp = 50;
	self.hpMax = 100;
	self.score = 0;
	self.upgrades = -2;

	var super_update = self.update;
	self.update = function () {
		self.updateSpd();
		super_update();

        if(self.pressingAttack) {
        	for(var i = -3; i < self.upgrades;i++) {
                self.shootBullet(i * 10 + self.mouseAngel);
			}

        }

		for(var i in Upgrade.list) {
			var u = Upgrade.list[i];
			console.log(self.x);
			if(getDistUpgrade(u, self) < 32) {
				u.toRemove = true;
				self.uppgrades += u.value;
				console.log('UPGRADE!');
			}
		}
	};

	self.shootBullet = function (angle) {
        Bullet({
        	parent: self.id,
			angle: angle,
			x: self.x,
			y: self.y,
			map:self.map
		});
    };
	
	self.updateSpd = function () {
		if(self.pressingRight)
			self.spdX = self.maxSpd;
		else if(self.pressingLeft)
			self.spdX = -self.maxSpd;
		else
			self.spdX = 0;
		if(self.pressingUp)
			self.spdY = -self.maxSpd;
		else if(self.pressingDown)
			self.spdY = self.maxSpd;
		else
			self.spdY = 0;

	};

	self.getInitPack = function () {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			number: self.number,
			hp: self.hp,
			hpMax: self.hpMax,
			score: self.score,
            map: self.map
		}
	};

	self.getUpdatePack = function () {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			number: self.number,
			hp: self.hp,
			score: self.score,
			map: self.map
		}
	};

	Player.list[self.id] = self;
	initPack.player.push(self.getInitPack());
	return self;
};
var getDistUpgrade = function (pt1, pt2) {
	pt1.x = (500/2 + pt1.x)*2 - pt2.x;
	pt1.y = (500/2 + pt1.y)*2 - pt2.y;
	return Math.sqrt( Math.pow((pt1.x-pt2.x), 2) + Math.pow((pt1.y-pt2.y), 2) );
};
Player.list = {};
Player.onConnect = function (socket, username) {
	var map = 'forest';
	if(Math.random() < 0.5)
		map = 'field';
	var player = Player({
		username: username,
		id: socket.id,
		map: map
    });

	socket.on('keyPress', function(data) {
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		if(data.inputId === 'right')
			player.pressingRight = data.state;
		if(data.inputId === 'up')
			player.pressingUp = data.state;
		if(data.inputId === 'down')
			player.pressingDown = data.state;
		if(data.inputId === 'attack')
            player.pressingAttack = data.state;
        if(data.inputId === 'mouseAngle')
            player.mouseAngel = data.state;
	});

    socket.on('sendMsgToServer', function(data) {
        for(var i in SOCKET_LIST) {
            SOCKET_LIST[i].emit('addToChat', player.username + ': ' + data);
        }
    });

    socket.on('sendPmToServer', function(data) {
    	var recipientSocket = null;
    	for(var i in Player.list){
    		if(Player.list[i].username === data.username)
				recipientSocket = SOCKET_LIST[i];
		}
		if(recipientSocket === null){
    		socket.emit('addToChat', 'The player '+data.username+' is not online');
		} else {
            recipientSocket.emit('addToChat', 'From: '+player.username+': ' + data.message);
            socket.emit('addToChat', 'To: '+data.username+': ' + data.message);
		}
    });

    socket.on('changeMap', function() {
    	if(player.map === 'field')
    		player.map = 'forest';
		else
			player.map = 'field';
    });

	socket.emit('init', {
		selfId: socket.id,
		player:Player.getAllInitPack(),
		bullet:Bullet.getAllInitPack()
	})
};

Player.getAllInitPack = function () {
	var players = [];
	for(var i in Player.list){
		players.push(Player.list[i].getInitPack());
	}
	return players;
};

Player.onDisconnect = function (socket) {
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
};

Player.update = function() {
	var pack = [];
	for( var i in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
};

//Bullets
var Bullet = function (param) {
	var self = Entity(param);
	self.id = Math.random();
	self.angle = param.angle;
	self.spdX = Math.cos(param.angle/180*Math.PI) * 20;
	self.spdY = Math.sin(param.angle/180*Math.PI) * 20;
	self.parent = param.parent;
	self.timer = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function () {
		if(self.timer++ > 100)
			self.toRemove = true;
		super_update();

		for(var i in Player.list) {
			var p = Player.list[i];
			if(self.map === p.map && self.getDistance(p) < 32 && self.parent !== p.id) {
				self.toRemove = true;
				p.hp -= 1;

				if(p.hp <= 0) {
					var shooter = Player.list[self.parent];
					if(shooter)
						shooter.score += 1;
					p.hp = p.hpMax;
					p.x= Math.random() * 500;
					p.y= Math.random() * 500;
				}

			}
		}
	};

	self.getInitPack = function () {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			map: self.map
		}
	};

	self.getUpdatePack = function () {
		return {
			id:self.id,
			x:self.x,
			y:self.y
		}
	};
	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
}
Bullet.list = {};

Bullet.update = function() {
	var pack = [];
	for( var i in Bullet.list) {
		var bullet = Bullet.list[i];
		bullet.update();
		if(bullet.toRemove) {
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else
			pack.push(bullet.getUpdatePack());
	}
	return pack;
};

Bullet.getAllInitPack = function () {
	var bullets = [];
	for(var i in Bullet.list){
		bullets.push(Bullet.list[i].getInitPack());
	}
	return bullets;
};

// Uppgrades
var Upgrade = function (param){
    var self = Entity(param);
    self.x = param.x;
    self.y = param.y;
    self.id = param.id;
    self.value = param.value;
    self.timer = 0;
    self.toRemove = false;

    var super_update = self.update;
    self.update = function () {
        if(self.timer++ > 300)
            self.toRemove = true;
        super_update();
    };

    self.getInitPack = function () {
        return {
            id:self.id,
            x:self.x,
            y:self.y,
            value:self.value
        }
    };

    self.getUpdatePack = function () {
        return {
            id:self.id,
            x:self.x,
            y:self.y,
            value:self.value
        }
    };
    Upgrade.list[self.id] = self;
    initPack.upgrade.push(self.getInitPack());
    return self;
};
Upgrade.list = {};

var randomlyGenerateUpgrade = function(){
    var x = Math.random()*250;
    var y = Math.random()*250;
    var id = Math.random();
    var value = Math.ceil(Math.random() * 4);
    Upgrade({
        x: x,
        y: y,
        id:id,
        value:value
    });
    console.log('Upgrade created... With value: ' + value );
};
Upgrade.getAllInitPack = function () {
    var upgrades = [];
    for(var i in Upgrade.list){
        upgrades.push(Upgrade.list[i].getInitPack());
    }
    return upgrades;
};
Upgrade.update = function() {
    var pack = [];
    for( var i in Upgrade.list) {
        var upgrade = Upgrade.list[i];
        upgrade.update();
        if(upgrade.toRemove) {
            console.log('Upgrade deleted ID: '+ Upgrade.list[i].id);
            delete Upgrade.list[i];
            removePack.upgrade.push(upgrade.id);
        } else
            pack.push(upgrade.getUpdatePack());
    }
    return pack;
};

var isValidPassword = function (data, cb) {
    db.query('SELECT * FROM users WHERE password = ?', data.password ,function (err, res) {
		if(res.length > 0) {
			cb(true);
		} else {
			cb(false);
		}
    });
};

var isUsernameTaken = function (data, cb) {
    db.query('SELECT * FROM users WHERE username = ?', data.username,function (err, res) {
        if(res.length > 0) {
            cb(true);
        } else {
            cb(false);
        }
    });
};

var addUser = function (data, cb) {
    db.query('INSERT INTO users (username, password, email) VALUES ('+data.username+','+data.password+',info@info.se)',function (err) {
        if(res.length > 0) {
            cb(true);
        } else {
            cb(false);
        }
    });
};

io.sockets.on('connection', function(socket) {
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

    socket.on('signIn', function(data) {
    	isValidPassword(data, function(res) {
            if(res) {
                Player.onConnect(socket, data.username);
                socket.emit('signInResponse', {success:true, username:data.username})
            } else {
                socket.emit('signInResponse', {success:false})
            }
		})
    });
    socket.on('signUp', function (data) {
    	isUsernameTaken(data, function(res){
    		if(res) {
    			socket.emit('signUpResponse', {success:false})
			} else {
    			addUser(data, function () {
                    socket.emit('signUpResponse', {success:true})
                });
			}
		});
		if(isUsernameTaken(data)){

		}

    });

	console.log('ID: '+socket.id + ' Connected');

	socket.on('disconnect', function() {
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
		console.log(socket.id + ' disconnected');
	});

    socket.on('evalServer', function(data) {
        var res = eval(data);
        if(res != undefined)
			socket.emit('evalAnswer', res);
    });

});

var initPack = {player:[],bullet:[],upgrade:[]};
var removePack = {player:[],bullet:[],upgrade:[]};


setInterval(function() {
    var create = Math.random() * 1000;
    if(create < 10)
        randomlyGenerateUpgrade();
	var pack = {
		player:Player.update(),
		bullet:Bullet.update(),
        upgrade:Upgrade.update()
	};

	for(var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('init' , initPack);
		socket.emit('update' , pack);
		socket.emit('remove' , removePack);
	}
	initPack.player = [];
	initPack.bullet = [];
    initPack.upgrade = [];
	removePack.player = [];
	removePack.bullet = [];
    removePack.upgrade = [];

}, 1000/25);

