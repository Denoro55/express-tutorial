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

// entities
const Guest = require('./entities/Guest');
const User = require('./entities/User');

const app = new express();
const logger = morgan('combined');
// app.use(logger);

// users
let users = [];

if (fs.existsSync(config.db.users)) {
    users = JSON.parse(fs.readFileSync(config.db.users, 'utf-8'));
}

app.use(bodyParser.urlencoded({ extended: false }));
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

// routes
app.get('/', (req, res, next) => {
    res.render('index');
});

app.get('/registration', (req, res, next) => {
    res.render('registration', {form: {}, errors: {}});
});

app.get('/login', (req, res, next) => {
    res.render('login', {form: {}, errors: {}});
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
    const user = users.find(u => u.nickname === nickname);
    if (user && user.password === encrypt(password)) {
        req.session.nickname = nickname;
        res.redirect('/');
        return;
    }

    res.status(422);
    res.render('login');
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

module.exports = app;
