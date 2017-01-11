var socket = io();

var WIDTH = 500;
var HEIGHT = 500;

//Sign in
var signDiv = document.getElementById('signDiv');
var signDivUsername = document.getElementById('signDiv-username');
var signDivSignIn = document.getElementById('signDiv-signIn');
var signDivSignUp = document.getElementById('signDiv-SignUp');
var signDivPassword = document.getElementById('signDiv-password');
var gameDiv = document.getElementById('gameDiv');

signDivSignIn.onclick = function () {
    socket.emit('signIn', {username:signDivUsername.value, password:signDivPassword.value});
    console.log(signDivUsername.value);
};
socket.on('signInResponse', function (data) {
    console.log(data);
    if(data.success) {
        signDiv.innerHTML = '<button type="button" class="btn btn-default">Loged in as '+data.username+'</button>';
        gameDiv.style.display = 'inline-block';
    } else {
        alert("Sign in unsuccessfull");
    }
});
// UI
var changeMap = function () {
    socket.emit('changeMap')
};



// Game
var ctx = document.getElementById('ctx').getContext("2d");
var ctxUi = document.getElementById('ctx-ui').getContext("2d");
var chatText = document.getElementById('messages');
var chatInput = document.getElementById('chat-input');
var chatForm = document.getElementById('chat-form');
var about = document.getElementById('about');
var wrapper = document.getElementById('wrapper');
var home = document.getElementById('home');

socket.on('addToChat', function (data) {
    chatText.innerHTML += '<div>' + data + '</div>';
});

socket.on('evalAnswer', function (data) {
    console.log(data);
});
about.onclick = function (e) {
    console.log('about clicked');
    wrapper.style.display = 'none';
};
home.onclick = function (e) {
    wrapper.style.display = 'inline-block'
}

chatForm.onsubmit = function (e) {
    e.preventDefault();
    if(chatInput.value[0] === '/')
        socket.emit('evalServer', chatInput.value.slice(1));
    else if(chatInput.value[0] === '@'){
        socket.emit('sendPmToServer', {
            username: chatInput.value.slice(1, chatInput.value.indexOf(',')),
            message: chatInput.value.slice(chatInput.value.indexOf(',') + 1)
        });
    }
    else
        socket.emit('sendMsgToServer', chatInput.value);

    chatInput.value = '';
};

var Img = {};
Img.player = new Image();
Img.player.src = 'img/player.png';
Img.bullet = new Image();
Img.bullet.src = 'img/bullet.png';
Img.map = {};
Img.map['field'] = new Image();
Img.map['field'].src = 'img/map.png';
Img.map['forest'] = new Image();
Img.map['forest'].src = 'img/map2.png';
Img.upgrade = new Image();
Img.upgrade.src = 'img/upgrade.png';

ctxUi.font = '30px Arial';

var Player = function(initPack) {
    var self = {};
    self.id = initPack.id;
    self.number = initPack.number;
    self.x = initPack.x;
    self.y = initPack.y;
    self.hp = initPack.hp;
    self.hpMax = initPack.hpMax;
    self.score = initPack.score;
    self.map = initPack.map;

    self.draw = function () {
        if(Player.list[selfId].map !== self.map)
            return;
        var x = self.x - Player.list[selfId].x + WIDTH/2;
        var y = self.y - Player.list[selfId].y + HEIGHT/2;

        var hpWidth = 30 * self.hp / self.hpMax;
        ctx.fillStyle = 'red';
        ctx.fillRect(x - hpWidth/2, y - 60, hpWidth,4);

        var width = Img.player.width*2;
        var height = Img.player.height*2;


        ctx.drawImage(Img.player, 0,0,Img.player.width,Img.player.height,x-width/2,y-height,width,height);

    };

    Player.list[self.id] = self;
    return self;
};
Player.list = {};

var Bullet = function (initPack) {
    var self = {};
    self.id = initPack.id;
    self.x = initPack.x;
    self.y = initPack.y;
    self.map = initPack.map;

    self.draw = function () {
        if(Player.list[selfId].map !== self.map)
            return;
        var width = Img.bullet.width/2;
        var height = Img.bullet.height/2;

        var x = self.x - Player.list[selfId].x + WIDTH/2;
        var y = self.y - Player.list[selfId].y + HEIGHT/2;

        ctx.drawImage(Img.bullet, 0,0,Img.bullet.width,Img.bullet.height,x-width/2,y-height,width,height);

    };

    Bullet.list[self.id] = self;
    return self;
};
Bullet.list = {};

var Upgrade = function (initPack) {
    var self = {};
    self.id = initPack.id;
    self.x = initPack.x;
    self.y = initPack.y;
    self.value = initPack.value;

    self.draw = function () {
        var player = Player.list[selfId];
        var x = (WIDTH/2 + self.x)*2 - player.x;
        var y = (HEIGHT/2 +  self.y)*2 - player.y;
        ctx.drawImage(Img.upgrade,0,0,Img.upgrade.width,Img.upgrade.height,x,y, 32,32);

    };

    Upgrade.list[self.id] = self;
    return self;
};
Upgrade.list = {};

//init
var selfId = null;

socket.on('init', function(data) {
    if(data.selfId)
        selfId = data.selfId;
    for(var i = 0; i < data.player.length;i++) {
        new Player(data.player[i]);
    }
    for(var i = 0; i < data.bullet.length;i++) {
        new Bullet(data.bullet[i]);
    }
    if(data.upgrade !== undefined){
        for(var i = 0; i < data.upgrade.length ;i++) {
            new Upgrade(data.upgrade[i]);
        }
    }
});

//update
socket.on('update', function (data) {
    for(var i = 0; i < data.player.length; i++){
        var pack = data.player[i];
        var p = Player.list[pack.id];
        if(p){
            if(pack.x !== undefined)
                if(pack.x < Img.player.width/2){
                    socket.emit('keyPress', {inputId: 'left', state:false});
                }
                else if(pack.x > Img.map[p.map].width*1.5 + Img.player.width/2) {
                    socket.emit('keyPress', {inputId: 'right', state:false});
                }
                else
                    p.x = pack.x;
            if(pack.y !== undefined)
                if(pack.y < Img.player.height + Img.player.height/2)
                    socket.emit('keyPress', {inputId: 'up', state:false});
                else if(pack.y > Img.map[p.map].height*2 + Img.player.height)
                    socket.emit('keyPress', {inputId: 'down', state:false});
                else
                    p.y = pack.y;
            if(pack.hp !== undefined)
                p.hp = pack.hp;
            if(pack.score !== undefined)
                p.score = pack.score;
            if(pack.map !== undefined)
                p.map = pack.map;
        }
    }
    for(var i = 0; i < data.bullet.length; i++){
        var pack = data.bullet[i];
        var b = Bullet.list[pack.id];
        if(b){
            if(pack !== undefined)
                b.x = pack.x;
            if(pack.y !== undefined)
                b.y = pack.y;
        }
    }
});
//remove
socket.on('remove', function (data) {
    for(var i = 0;i < data.player.length;i++){
        delete Player.list[data.player[i]];
    }
    for(var i = 0;i < data.bullet.length;i++){
        delete Bullet.list[data.bullet[i]];
    }
    for(var i = 0;i < data.upgrade.length;i++){
        delete Upgrade.list[data.upgrade[i]];
    }
});

setInterval(function () {
    if(!selfId)
        return;
    ctx.clearRect(0,0,500,500);
    drawMap();
    drawScore();
    for(var i in Upgrade.list)
        Upgrade.list[i].draw();
    for(var i in Player.list)
        Player.list[i].draw();
    for(var i in Bullet.list)
        Bullet.list[i].draw();
}, 40);

var drawMap = function () {
    var player = Player.list[selfId];
    var x = WIDTH/2 - player.x;
    var y = HEIGHT/2 - player.y;
    ctx.drawImage(Img.map[player.map],0,0,Img.map[player.map].width, Img.map[player.map].height,x,y, WIDTH*2,HEIGHT*2);
};
var lastScore = null;

var drawScore = function () {
    var playersOnline = 0;
    if(lastScore === Player.list[selfId])
        return;
    for(var i in Player.list){
        if(Player.list[i].map === Player.list[selfId].map)
            playersOnline++;
    }
    ctxUi.clearRect(0,0,500,500);
    lastScore = Player.list[selfId].score;
    ctxUi.fillStyle = 'black';
    ctxUi.fillText('Score: '+Player.list[selfId].score,0,30);
    ctxUi.fillText('Players on map: '+ playersOnline,250,30);
};

document.onkeydown = function(event) {
    if(event.keyCode === 68) // d
        socket.emit('keyPress', {inputId: 'right', state:true});
    else if(event.keyCode === 83) // s
        socket.emit('keyPress', {inputId: 'down', state:true});
    else if(event.keyCode === 65) // a
        socket.emit('keyPress', {inputId: 'left', state:true});
    else if(event.keyCode === 87) // w
        socket.emit('keyPress', {inputId: 'up', state:true});

};

document.onkeyup = function(event) {
    if(event.keyCode === 68) // d
        socket.emit('keyPress', {inputId: 'right', state:false});
    else if(event.keyCode === 83) // s
        socket.emit('keyPress', {inputId: 'down', state:false});
    else if(event.keyCode === 65) // a
        socket.emit('keyPress', {inputId: 'left', state:false});
    else if(event.keyCode === 87) // w
        socket.emit('keyPress', {inputId: 'up', state:false});
};

document.onmousedown = function (event) {
    socket.emit('keyPress', {inputId: 'attack', state:true})
};
document.onmouseup = function (event) {
    socket.emit('keyPress', {inputId: 'attack', state:false})
};
document.onmousemove = function (event) {
    var x = -250 + event.clientX - 8;
    var y = -250 + event.clientY - 8;
    var angle = Math.atan2(y,x) / Math.PI * 180;
    socket.emit('keyPress', {inputId: 'mouseAngle',state:angle})
};

