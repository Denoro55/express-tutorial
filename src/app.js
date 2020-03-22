const express = require('express');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const session = require('express-session');
const methodOverride = require('method-override');

const NotFoundError = require('./errors/NotFoundError');
const config = require('../config');
const encrypt = require('./helpers/encrypt');

// const mongoose = require('mongoose');
// mongoose.connect('mongodb://den55:12345a@ds125723.mlab.com:25723/express-game', {useNewUrlParser: true, useUnifiedTopology: true});

// const Cat = mongoose.model('Cat', { name: String });
//
// const kitty = new Cat({ name: 'Zildjian' });
// kitty.save().then(() => console.log('meow'));

// entities
const Guest = require('./entities/Guest');
const User = require('./entities/User');

// const app = new express();
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const logger = morgan('combined');
// app.use(logger);

// users
let users = [];

if (fs.existsSync(config.db.users)) {
    users = JSON.parse(fs.readFileSync(config.db.users, 'utf-8'));
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
}));

app.set('view engine', 'pug');
app.use('/static', express.static(path.join(__dirname, '..', 'static')));

app.use(function(req, res, next) {
    if (req.session.nickname) {
        const nickname = req.session.nickname;
        const user = users.find(u => u.nickname === nickname);
        res.locals.currentUser = new User(nickname);
    } else {
        res.locals.currentUser = new Guest();
    }
    next();
});

// sockets
let rooms = {};
const roomPrefix = 'room_';

const getRoom = (id) => {
    return roomPrefix + id;
};

io.on('connection', function(socket) {
    console.log('a user connected: ', socket.id);

    socket.on('init', function() {
        console.log('init', rooms);
        socket.emit('init', { rooms });
    });

    socket.on('createRoom', function(data) {
        rooms[data.roomId] = {
            bgIndex: data.bgIndex,
            admin: {
                name: data.name,
                id: socket.id
            },
            opponent: {
                name: null,
                id: null
            }
        };
        socket.join(getRoom(data.roomId));
        io.emit('roomListUpdated', { rooms });
        console.log(rooms);
    });

    socket.on('joinRoom', function(data) {
        socket.join(getRoom(data.roomId));
        rooms[data.roomId].opponent.name = data.name;
        rooms[data.roomId].opponent.id = socket.id;
        const gameData = {
            status: 'Игра',
            roomId: data.roomId,
            bgIndex: rooms[data.roomId].bgIndex,
            player1: {
                name: rooms[data.roomId].admin.name,
            },
            player2: {
                name: rooms[data.roomId].opponent.name,
            },
            playerIndex: 2
        };
        socket.emit('startGame', gameData); // second player
        socket.broadcast.to(getRoom(data.roomId)).emit('startGame', { ...gameData, playerIndex: 1 }); // admin player
        console.log(rooms);
    });

    // game
    socket.on('gameChangeTurn', function(data) {
        socket.broadcast.to(getRoom(data.roomId)).emit('gameChangeTurn', { code: data.attackCode });
    });

    socket.on('gameEndCalculating', function(data) {
        socket.broadcast.to(getRoom(data.roomId)).emit('gameEndCalculating', { health1: data.health1, health2: data.health2 });
    });

    socket.on('gameEndAttack', function(data) {
        socket.broadcast.to(getRoom(data.roomId)).emit('gameEndAttack', {} );
    });

    socket.on('gameOpponentAbilities', function(data) {
        socket.broadcast.to(getRoom(data.roomId)).emit('gameOpponentAbilities', {abilities: data.abilities} );
    });

    socket.on('gameEndTurn', function(data) {
        socket.broadcast.to(getRoom(data.roomId)).emit('gameEndTurn', {} );
    });

    socket.on('gamePlayersStatus', function(data) {
        socket.broadcast.to(getRoom(data.roomId)).emit('gamePlayersStatus', { status: data.status } );
    });

    socket.on('disconnect', function() {
        console.log('disconnect, ', socket.id);
        const hostedRoom = Object.entries(rooms).find(([k, v]) => {
            return v.admin.id === socket.id
        });

        const roomId = Object.entries(rooms).find(([k, v]) => {
            return v.admin.id === socket.id || v.opponent && v.opponent.id === socket.id
        });

        if (roomId) {
            socket.broadcast.to(getRoom(roomId[0])).emit('gameUserLeft', {} );
            console.log('Игрок вышел из команты: ', roomId[0]);
        }

        if (hostedRoom !== undefined) {
            console.log('delete room: ', hostedRoom[0]);
            delete rooms[hostedRoom[0]];
            io.emit('roomListUpdated', { rooms });
        }
        console.log(rooms);
    });
});

// routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/registration', (req, res) => {
    res.render('registration', {form: {}, errors: {}});
});

app.get('/login', (req, res) => {
    res.render('login', {form: {}, errors: {}});
});

app.get('/game', (req, res) => {
    res.render('game');
});

app.get('/room', (req, res) => {
    res.render('room');
});

app.post('/getName', (req, res) => {
    if (req.session.nickname) {
        res.json({name: req.session.nickname})
    } else {
        res.json({name: 'no name'})
    }
});

app.post('/registration', (req, res, next) => {
    const {nickname, password} = req.body;
    const errors = {};

    if (!nickname) {
        errors.nickname = 'Неверное имя';
    } else {
        const isUnique = !users.some(u => u.nickname === nickname);
        if (!isUnique) {
            errors.nickname = 'Имя занято';
        }
    }

    if (!password) {
        errors.password = 'Неверный пароль';
    }

    if (Object.keys(errors).length === 0) {
        const newUser = {
            nickname,
            password: encrypt(password)
        };

        users.push(newUser);
        fs.writeFileSync(config.db.users, JSON.stringify(users, null, 2));

        res.redirect('/');
        return;
    }

    res.status(422);
    res.render('registration', {form: req.body, errors});
});

app.post('/login', (req, res) => {
    const {nickname, password} = req.body;
    const errors = {};

    if (!nickname) {
        errors.nickname = 'Неверное имя';
    }

    if (!password) {
        errors.password = 'Неверный пароль';
    }

    if (Object.keys(errors).length === 0) {
        const user = users.find(u => u.nickname === nickname);
        if (user && user.password === encrypt(password)) {
            req.session.nickname = nickname;
            res.redirect('/');
            return;
        } else {
            errors.main = 'Неверное имя или пароль';
        }
    }

    res.status(422);
    res.render('login', {form: req.body, errors});
});

app.delete('/session', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/');
    })
});

app.use((req, res, next) => {
    next(new NotFoundError());
});

app.use((err, req, res, next) => {
    console.log(err);

    switch (err.status) {
        case 404:
            res.status(404);
            res.render('404');
            break;
        default:
            throw new Error('Unexpected Error');
    }
});

module.exports = http;
