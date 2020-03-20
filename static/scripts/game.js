window.onload = function() {
    (() => {
        // const socket = io('https://fathomless-brushlands-15572.herokuapp.com/');
        const socket = io(window.location.host);

        // init
        let name;
        fetch('/getName', {method: 'POST'})
            .then(response => response.json())
            .then(json => {
                name = json.name;
                // engine.setName(name);
            });

        socket.emit('init');
        socket.on('init', (data) => {
            updateRoomList(data.rooms);
        });

        const elements = {
            gameContainer: document.querySelector('.game'),
            roomsContainer: document.querySelector('.room-list'),
            formCreateRoom: document.getElementById('js-create-room'),
            gameStatus: document.querySelector('.js-game-status'),
            player1Info: document.querySelector('.js-player-info-1'),
            player2Info: document.querySelector('.js-player-info-2')
        };

        // создание комнаты
        elements.formCreateRoom.onsubmit = function(e) {
            e.preventDefault();
            const roomId = e.target.elements[0].value;
            if (roomId) {
                socket.emit('createRoom', { roomId, name });
                elements.gameContainer.classList.add('active');
            }
        };

        const updateRoomList = (rooms) => {
              elements.roomsContainer.innerHTML = '';
              Object.entries(rooms).forEach(([id, values]) => {
                  const item = document.createElement('li');
                  item.className = 'room-list__item';
                  const button = document.createElement('button');
                  button.textContent = 'Комната ' + id;
                  button.addEventListener('click', () => {
                      socket.emit('joinRoom', { name, roomId: id });
                  });
                  item.appendChild(button);
                  elements.roomsContainer.appendChild(item);
              })
        };

        socket.on('roomListUpdated', (data) => {
            updateRoomList(data.rooms);
        });

        socket.on('startGame', (data) => {
            renderGame(data);

            engine.setRoomId(data.roomId);
            engine.startGame(data.playerIndex, data.player1.name, data.player2.name);
        });

        socket.on('gamePlayersStatus', function(data) {
            if (data.status) {
                document.querySelector('.js-opponent-info').classList.remove('off');
            } else {
                document.querySelector('.js-opponent-info').classList.add('off');
            }
        });

        socket.on('gameUserLeft', function(data) {
            document.querySelector('.js-opponent-info').classList.add('left');
        });

        function renderGame(data) {
            elements.gameStatus.innerHTML = data.status;
            elements.gameContainer.classList.add('active');
            elements.gameContainer.classList.add('play');

            elements.player1Info.querySelector('.player-info__name').innerHTML = data.player1.name;
            elements.player2Info.querySelector('.player-info__name').innerHTML = data.player2.name;

            if (data.playerIndex === 2) {
                elements.player1Info.classList.add('js-opponent-info');
            } else {
                elements.player2Info.classList.add('js-opponent-info');
            }

            document.querySelector('.js-opponent-info').classList.remove('left');
        }

        const getAttackPosition = {
            1: (options) => {
                return {
                    x: options.x + (options.attackStartTime - options.currentAttackTime),
                    y: options.y + 50
                }
            },
            2: (options) => {
                return {
                    x: options.x - 50 - (options.attackStartTime - options.currentAttackTime),
                    y: options.y + 120
                }
            }
        };

        class Game {
            constructor() {
                this.canvas = document.querySelector('#game');
                this.ctx = this.canvas.getContext('2d');
                this.gameWidth = this.canvas.width;
                this.gameHeight = this.canvas.height;
                // this.player1 = params.player1;
                // this.player2 = params.player2;
                // this.players = [this.player1, this.player2];
                this.turns = 0;
                this.turnTimer = null;
                this.playerSettings = {
                    size: {
                        x: 150,
                        y: 250
                    },
                    position: {
                        x: 50,
                        y: 180
                    },
                    color: '#fff',
                    health: {
                        color: 'green',
                        max: 100,
                        size: 23
                    },
                    magic: {
                        color: 'blue',
                        max: 100,
                        size: 23
                    }
                };

                // sockets
                socket.on('gameChangeTurn', (data) => {
                    // clearTimeout(this.turnTimer);
                    this.turns += 1;
                    console.log('socket change turn, ', this.turns);
                    const enemyAttack = this.currentPlayer.controls[data.code];
                    this.currentPlayer.setState('attack', enemyAttack);
                    if (this.turns >= 2) { // подсчет
                        console.log('turns >= 2');
                    } else {
                        console.log('socket change turn -> change turn');
                        this.changeTurn();
                        this.turnTimer = setTimeout(() => {
                            this.makeTurn('KeyL', true);
                        }, 1500);
                    }
                });

                socket.on('gameEndCalculating', (data) => {
                    this.player1.setHealth(data.health1);
                    this.player2.setHealth(data.health2);
                });

                socket.on('gameEndAttack', () => {
                    console.log('socket gameEndAttack');
                    this.players.forEach(player => {
                        player.setState('endAttack', player.attack.params);
                    });
                });

                socket.on('gameEndTurn', () => {
                    console.log('socket gameEndTurn');
                    this.turns = 0;
                    this.checkWinner();
                });
            }

            start(myPlayerIndex, name1, name2) {
                this.turns = 0;
                this.player1 = new Player({
                    name: name1,
                    skin: '/static/img/skins/1.jpg',
                    index: 1
                });
                this.player2 = new Player({
                    name: name2,
                    skin: '/static/img/skins/2.jpg',
                    index: 2
                });
                this.players = [this.player1, this.player2];
                this.setMyPlayer(myPlayerIndex);
                this.currentPlayer = this.player1;
                this.currentPlayer.currentOptions.color = 'aqua';
            }

            setMyPlayer(index) {
                this.myPlayer = index === 1 ? this.player1 : this.player2;
            }

            makeTurn(code, access = false) {
                // debug info
                if (code === 'KeyM') {
                    console.log(this);
                    return;
                }

                if (this.isTurningPlayer() && this.turns < 2 || access) {
                    console.log('make turn player', this.currentPlayer.index);
                    const attack = this.currentPlayer.controls[code];
                    if (!attack) return;

                    clearTimeout(this.turnTimer);
                    this.currentPlayer.setState('attack', attack);
                    this.turns += 1;
                    engine.emitToRoom('gameChangeTurn', {attackCode: code});

                    if (this.turns >= 2) { // подсчет
                        this.endTurns();
                    } else {
                        this.changeTurn();
                        // this.turnTimer = setTimeout(() => {
                        //     this.makeTurn('KeyL', true);
                        // }, 1500);
                    }
                } else {
                    // console.log('cant make turn');
                }
            }

            changeTurn() {
                console.log('change turn, turns: ', this.turns);
                this.currentPlayer.currentOptions.color = this.currentPlayer.options.color;
                this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
                this.currentPlayer.currentOptions.color = 'aqua';
            }

            endTurns() {
                setTimeout(() => {
                    console.log('подсчет');
                    this.calculateDamage(this.player1.attack.params, this.player2.attack.params);
                    setTimeout(() => {
                        this.players.forEach(player => {
                            player.setState('endAttack', player.attack.params);
                        });
                        console.log('send end turn');
                        engine.emitToRoom('gameEndAttack');
                        setTimeout(() => {
                            this.turns = 0;
                            this.checkWinner();
                            engine.emitToRoom('gameEndTurn');
                        }, 600);
                    }, 600);
                }, 1000);
            }

            calculateDamage(attack1, attack2) {
                let player1 = this.player1;
                let player2 = this.player2;

                for (let i = 0; i < 2; i++) {
                    if (i > 0) {
                        [attack1, attack2] = [attack2, attack1];
                        [player1, player2] = [player2, player1];
                    }
                    if (attack1) {
                        for (let aa = 0; aa < attack1.attackArea.length; aa++) { // удар в голову [0,1]
                            if (attack1.attackArea[aa] === attack2.position) {
                                if (attack2.blockType && attack2.blockType === attack1.attackType) {
                                    player2.updateHealth(Math.floor((-attack1.damage[aa] + (attack1.damage[aa] * attack2.blockPercentage / 100))));
                                } else {
                                    player2.updateHealth(Math.floor(-attack1.damage[aa]));
                                }
                                break;
                            }
                        }
                    }
                }

                engine.emitToRoom('gameEndCalculating', {health1: player2.hp, health2: player1.hp});
                // this.player1.showDamage();
                // this.player2.showDamage();
            }

            checkWinner() {
                let restart = false;
                if (this.player1.hp <= 0) {
                    this.player2.wins += 1;
                    restart = true;
                }
                if (this.player2.hp <= 0) {
                    this.player1.wins += 1;
                    restart = true;
                }
                if (restart) {
                    this.restartGame();
                }
            }

            restartGame() {
                this.players.forEach(player => {
                    player.reset();
                });
                this.currentPlayer.currentOptions.color = 'aqua';
            }

            isTurningPlayer () {
                return this.myPlayer === this.currentPlayer;
            }

            update() {
                this.players.forEach(player => {
                    if (player.attack.dir > 0 && player.attack.time > 0) {
                        player.attack.time -= player.options.attack.speed;
                    } else if (player.attack.dir < 0 && player.attack.time < player.options.attack.startTime) {
                        player.attack.time += player.options.attack.speed;
                    }
                })
            }

            render() {
                const ctx = this.ctx;
                ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
                this.drawBackground(ctx);
                this.drawText(ctx);
                this.drawPlayers(ctx);
            }

            drawBackground(ctx) {
                const img = document.getElementById("bg");
                ctx.drawImage(img, 0, 0);
            }

            drawText(ctx) {
                ctx.font = "16px Arial";
                ctx.fillStyle = "#fff";
                ctx.textAlign = "center";
                ctx.fillText(this.player1.getName() + ' против ' + this.player2.getName(), this.gameWidth / 2, 40);
                ctx.font = "12px Arial";
                ctx.fillText(this.player1.getWins() + ':' + this.player2.getWins(), this.gameWidth / 2, 60);
            }

            drawPlayers(ctx) {
                const player = this.playerSettings;

                for (let i = 0; i < 2; i++) {
                    const currentPlayer = i === 0 ? this.player1 : this.player2;
                    if (i === 0) { // player 1
                        this.drawPlayer(ctx, {
                            player: currentPlayer,
                            imageX: player.position.x,
                            posX: player.position.x,
                            barX: 0,
                            attackDir: 1
                        });
                    } else { // player 2
                        this.drawPlayer(ctx, {
                            player: currentPlayer,
                            imageX: this.gameWidth - player.position.x - player.size.x,
                            posX: this.gameWidth - player.position.x - player.size.x,
                            barX: (this.gameWidth - player.position.x - player.size.x) - player.position.x,
                            attackDir: -1
                        });
                    }
                }
            }

            drawPlayer(ctx, params) {
                const player = this.playerSettings;
                const currentPlayer = params.player;

                // attack
                const attackOptions = currentPlayer.options.attack;

                const attackStartTime = attackOptions.startTime;
                const attackBlock = {
                    width: attackOptions.width,
                    height: attackOptions.height
                };

                const attackPosition = getAttackPosition[currentPlayer.index]({
                    x: params.posX,
                    y: player.position.y,
                    width: player.size.x,
                    attackStartTime,
                    currentAttackTime: currentPlayer.attack.time
                });

                ctx.beginPath();
                ctx.globalAlpha = Math.max(0, 1 - (currentPlayer.attack.time / attackStartTime));
                ctx.fillStyle = 'black';
                ctx.strokeStyle = 'blue';
                ctx.rect(attackPosition.x, attackPosition.y, attackBlock.width, attackBlock.height);
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.font = "14px Arial";
                ctx.fillStyle = "#fff";
                ctx.textAlign = "center";
                ctx.fillText(currentPlayer.attack.params.name, attackPosition.x + attackBlock.width / 2, attackPosition.y + 4 + attackBlock.height / 2);

                ctx.globalAlpha = 1;

                // other
                ctx.drawImage(currentPlayer.skin, params.imageX, player.position.y, player.size.x, player.size.y);
                ctx.beginPath();
                ctx.strokeStyle = currentPlayer.currentOptions.color;
                ctx.rect(params.posX, player.position.y, player.size.x, player.size.y);
                ctx.stroke();
                this.drawBars(ctx, params.barX, currentPlayer);
            }

            drawBars(ctx, offsetX, currentPlayer) {
                const player = this.playerSettings;

                const healthPosition = {x: offsetX + player.position.x, y: player.position.y - 70};
                const manaPosition = {x: offsetX + player.position.x, y: player.position.y - 36};

                const healthPercent = currentPlayer.hp / currentPlayer.maxhp;

                ctx.textAlign = "left";

                // health
                ctx.beginPath();
                ctx.fillStyle = 'red';
                ctx.rect(healthPosition.x, healthPosition.y, player.size.x, player.health.size);
                ctx.fill();

                ctx.beginPath();
                ctx.fillStyle = player.health.color;
                ctx.rect(healthPosition.x, healthPosition.y, player.size.x * healthPercent, player.health.size);
                ctx.fill();

                ctx.font = "12px Arial";
                ctx.fillStyle = "#fff";
                ctx.fillText(currentPlayer.hp + "/" + currentPlayer.maxhp, healthPosition.x + 5, healthPosition.y + 16);

                ctx.beginPath();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = "1";
                ctx.rect(healthPosition.x, healthPosition.y, player.size.x, player.health.size);
                ctx.stroke();

                ctx.beginPath();
                ctx.fillStyle = player.magic.color;
                ctx.rect(manaPosition.x, manaPosition.y, player.size.x, player.magic.size);
                ctx.fill();

                ctx.beginPath();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = "1";
                ctx.rect(manaPosition.x, manaPosition.y, player.size.x, player.magic.size);
                ctx.stroke();

                ctx.font = "12px Arial";
                ctx.fillStyle = "#fff";
                ctx.fillText(currentPlayer.mana + "/" + currentPlayer.maxmana, manaPosition.x + 5, manaPosition.y + 16);
            }
        }

        class Player {
            constructor(options) {
                this.name = options.name;
                this.setSkin(options.skin);
                this.wins = 0;
                this.maxhp = 100;
                this.hp = this.maxhp;
                this.maxmana = 100;
                this.mana = this.maxmana;
                this.index = options.index;
                this.options = {
                    color: '#fff',
                    attack: {
                        width: 200,
                        height: 50,
                        startTime: 195,
                        speed: 6
                    }
                };
                this.currentOptions = {
                    color: this.options.color
                };
                this.attack = {
                    time: this.options.attack.startTime,
                    dir: -1,
                    params: {
                        name: ''
                    }
                };
                this.controls = {
                    'KeyW': {
                        damage: [0],
                        attackArea: [-1],
                        position: 0,
                        name: 'Прыжок'
                    },
                    'KeyS': {
                        damage: [0],
                        attackArea: [-1],
                        position: 2,
                        name: 'Присед'
                    },
                    'KeyA': {
                        damage: [15],
                        attackArea: [0],
                        attackType: 1,
                        position: 0,
                        name: 'Захват в прыжке'
                    },
                    'KeyF': {
                        damage: [10, 20],
                        attackArea: [0, 1],
                        attackType: 1,
                        position: 1,
                        name: 'Удар в голову'
                    },
                    'KeyG': {
                        damage: [10, 20],
                        attackArea: [1, 2],
                        attackType: 1,
                        position: 1,
                        name: 'Удар с ноги'
                    },
                    'KeyH': {
                        damage: [15, 5],
                        attackArea: [1, 0],
                        attackType: 1,
                        position: 0,
                        name: 'Удар в прыжке'
                    },
                    'KeyJ': {
                        damage: [15, 5],
                        attackArea: [1, 2],
                        attackType: 3,
                        position: 2,
                        name: 'Подножка'
                    },
                    // 'KeyZ': {
                    //     damage: [0],
                    //     attackArea: [-1],
                    //     position: 1,
                    //     blockType: 1,
                    //     blockPercentage: 100,
                    //     name: 'Верхний блок'
                    // },
                    'KeyZ': {
                        damage: [0],
                        attackArea: [-1],
                        position: 1,
                        blockType: 1,
                        blockPercentage: 100,
                        name: 'Блок'
                    },
                    'KeyX': {
                        damage: [0],
                        attackArea: [-1],
                        position: 2,
                        blockType: 3,
                        blockPercentage: 100,
                        name: 'Нижний блок'
                    },
                    'KeyL': {
                        damage: [0],
                        attackArea: [-1],
                        position: 1,
                        name: 'Ничего не делать'
                    }
                }
            }

            setSkin(src) {
                const image = new Image(800, 500);
                image.src = src;
                this.skin = image;
            }

            getName() {
                return this.name
            }

            getWins() {
                return this.wins;
            }

            setState(state, params) {
                switch (state) {
                    case 'attack':
                        console.log('attack state, ', this.index);
                        this.attack = {
                            time: this.options.attack.startTime,
                            params: params,
                            dir: 1
                        };
                        break;
                    case 'endAttack':
                        console.log('end attack state, ', this.index);
                        this.attack.time = 0;
                        this.attack.dir = -1;
                        break;
                }
            }

            reset() {
                this.hp = this.maxhp;
                this.mana = this.maxhp;
                this.currentOptions.color = this.options.color;
            }

            updateHealth(add) {
                this.hp += add;
            }

            setHealth(value) {
                this.hp = value;
            }
        }

        class Engine {
            constructor() {
                this.game = new Game();
                this.active = false;
                this.roomId = null;

                document.addEventListener('keydown', (event) => {
                    // console.log(event.code);
                    this.makeTurn(event.code);
                });

                window.onblur = () => {
                    this.pauseGame();
                };

                window.onfocus = () => {
                    this.continueGame();
                };
            }

            // setName(name) {
            //     this.name = name;
            // }

            setRoomId(id) {
                this.roomId = id;
            }

            startGame(myPlayerIndex, name1, name2) {
                this.game.start(myPlayerIndex, name1, name2);

                if (!this.active) {
                    this.run();
                    this.active = true;
                }
            }

            makeTurn(code) {
                if (this.active) {
                    this.game.makeTurn(code);
                }
            }

            pauseGame() {
                this.emitToRoom('gamePlayersStatus', {status: false});
            }

            continueGame() {
                this.emitToRoom('gamePlayersStatus', {status: true});
            }

            run() {
                const frame = () => {
                    this.game.update();
                    this.game.render();

                    window.requestAnimationFrame(frame);
                };

                frame();
            }

            emitToRoom(url, params) {
                if (this.roomId) {
                    const data = {
                        roomId: this.roomId,
                        ...params
                    };
                    socket.emit(url, data);
                }
            }
        }

        const engine = new Engine();

    })()
};
