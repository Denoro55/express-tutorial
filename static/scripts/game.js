window.onload = function() {
    (() => {
        const socket = io();

        // init
        let name;
        fetch('/getName', {method: 'POST'})
            .then(response => response.json())
            .then(json => {
                name = json.name;
            });

        socket.emit('init');
        socket.on('init', (data) => {
            updateRoomList(data.rooms);
        });

        const elements = {
            gameContainer: document.querySelector('.game'),
            roomsContainer: document.querySelector('.room-list'),
            formCreateRoom: document.getElementById('js-create-room'),
            gameStatus: document.querySelector('.js-game-status')
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
            elements.gameStatus.innerHTML = data.status;
            elements.gameContainer.classList.add('active');

            const image = new Image(800, 500);
            image.src = '/static/img/skins/1.jpg';

            const image2 = new Image(800, 500);
            image2.src = '/static/img/skins/2.jpg';

            const player1 = new Player({
                name: data.player1.name,
                skin: image,
                index: 1
            });

            const player2 = new Player({
                name: data.player2.name,
                skin: image2,
                index: 2
            });

            const myPlayer = data.player === 1 ? player1 : player2;

            engine.startGame(player1, player2, myPlayer, data.roomId);
        });

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
            constructor(params) {
                this.canvas = document.querySelector('#game');
                this.ctx = this.canvas.getContext('2d');
                this.gameWidth = this.canvas.width;
                this.gameHeight = this.canvas.height;
                this.player1 = params.player1;
                this.player2 = params.player2;
                this.players = [this.player1, this.player2];
                this.currentPlayer = this.player1;
                this.currentPlayer.options.color = 'aqua';
                this.myPlayer = params.myPlayer;
                this.roomId = params.roomId;
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
                    console.log('socket change turn');
                    clearTimeout(this.turnTimer);
                    this.turns += 1;
                    const enemyAttack = this.currentPlayer.controls[data.code];
                    this.currentPlayer.setState('attack', enemyAttack);
                    if (this.turns >= 2) { // подсчет
                        //
                    } else {
                        this.changeTurn();
                    }
                });

                socket.on('gameEndCalculating', (data) => {
                    this.player1.setHealth(data.health1);
                    this.player2.setHealth(data.health2);
                });

                socket.on('gameEndAttack', () => {
                    this.players.forEach(player => {
                        player.setState('endAttack', player.attack.params);
                    });
                });

                socket.on('gameEndTurn', () => {
                    this.turns = 0;
                    this.checkWinner();
                });
            }

            makeTurn(code, access = false) {
                if (this.isTurningPlayer() && this.turns < 2 || access) {
                    console.log('make turn');
                    const attack = this.currentPlayer.controls[code];
                    if (!attack) return;

                    this.currentPlayer.setState('attack', attack);
                    this.turns += 1;
                    socket.emit('gameChangeTurn', { roomId: this.roomId, attackCode: code });

                    if (this.turns >= 2) { // подсчет
                        this.endTurns();
                    } else {
                        this.changeTurn();
                        this.turnTimer = setTimeout(() => {
                            this.makeTurn('KeyL', true);
                        }, 1500);
                    }
                } else {
                    console.log('cant make turn');
                }
            }

            changeTurn() {
                console.log('change turn');
                this.currentPlayer.options.color = '#fff';
                this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
                this.currentPlayer.options.color = 'aqua';
            }

            endTurns() {
                setTimeout(() => {
                    console.log('подсчет');
                    this.calculateDamage(this.player1.attack.params, this.player2.attack.params);
                    setTimeout(() => {
                        this.players.forEach(player => {
                            player.setState('endAttack', player.attack.params);
                        });
                        socket.emit('gameEndAttack', { roomId: this.roomId });
                        setTimeout(() => {
                            this.turns = 0;
                            this.checkWinner();
                            socket.emit('gameEndTurn', { roomId: this.roomId });
                        }, 600);
                    }, 600);
                }, 1000);
            }

            calculateDamage(attack1, attack2) {
                console.log(attack1, attack2);
                let player1 = this.player1;
                let player2 = this.player2;

                for (let i = 0; i < 2; i++) {
                    if (i > 0) {
                        [attack1, attack2] = [attack2, attack1];
                        [player1, player2] = [player2, player1];
                    }
                    if (attack1) {
                        for (let aa = 0; aa < attack1.attackArea.length; aa++) {
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

                socket.emit('gameEndCalculating', { roomId: this.roomId, health1: player2.hp, health2: player1.hp });
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
                })
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
                ctx.strokeStyle = currentPlayer.options.color;
                ctx.rect(params.posX, player.position.y, player.size.x, player.size.y);
                ctx.stroke();
                this.drawBars(ctx, params.barX, currentPlayer);
            }

            drawBars(ctx, offsetX, currentPlayer) {
                const player = this.playerSettings;

                const healthPosition = {x: offsetX + player.position.x, y: player.position.y - 70};
                const manaPosition = {x: offsetX + player.position.x, y: player.position.y - 36};

                ctx.textAlign = "left";

                ctx.beginPath();
                ctx.fillStyle = player.health.color;
                ctx.rect(healthPosition.x, healthPosition.y, player.size.x, player.health.size);
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

        // function startGame(player1, player2, myPlayer, roomId) {
        //     const game = new Game({
        //         player1,
        //         player2,
        //         myPlayer,
        //         roomId
        //     });
        //
        //     // нажатия клавиш
        //     document.addEventListener('keydown', (event) => {
        //         console.log(event.code);
        //         game.makeTurn(event.code);
        //     });
        //
        //     function update() {
        //         game.update();
        //         game.render();
        //         window.requestAnimationFrame(update);
        //     }
        //
        //     window.requestAnimationFrame(update);
        // }

        class Engine {
            startGame(player1, player2, myPlayer, roomId) {
                this.game = new Game({player1, player2, myPlayer, roomId});

                document.addEventListener('keydown', (event) => {
                    console.log(event.code);
                    this.game.makeTurn(event.code);
                });

                this.run();
            }

            run() {
                const frame = () => {
                    this.game.update();
                    this.game.render();

                    window.requestAnimationFrame(frame);
                };

                frame();
            }
        }

        const engine = new Engine();

        class Player {
            constructor(options) {
                this.name = options.name;
                this.skin = options.skin;
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
                    'KeyF': {
                        damage: [10, 15],
                        attackArea: [0, 1],
                        attackType: 1,
                        position: 1,
                        name: 'Удар в голову'
                    },
                    'KeyG': {
                        damage: [10, 15],
                        attackArea: [1, 2],
                        attackType: 2,
                        position: 1,
                        name: 'Удар по корпусу'
                    },
                    'KeyH': {
                        damage: [15, 10],
                        attackArea: [1, 0],
                        attackType: 1,
                        position: 0,
                        name: 'Удар в прыжке'
                    },
                    'KeyJ': {
                        damage: [10, 5],
                        attackArea: [1, 2],
                        attackType: 3,
                        position: 2,
                        name: 'Подножка'
                    },
                    'KeyZ': {
                        damage: [0],
                        attackArea: [-1],
                        position: 1,
                        blockType: 1,
                        blockPercentage: 70,
                        name: 'Верхний блок'
                    },
                    'KeyX': {
                        damage: [0],
                        attackArea: [-1],
                        position: 1,
                        blockType: 2,
                        blockPercentage: 70,
                        name: 'Блок'
                    },
                    'KeyC': {
                        damage: [0],
                        attackArea: [-1],
                        position: 1,
                        blockType: 3,
                        blockPercentage: 70,
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

            getName() {
                return this.name
            }

            getWins() {
                return this.wins;
            }

            setState(state, params) {
                switch (state) {
                    case 'attack':
                        this.attack = {
                            time: this.options.attack.startTime,
                            params: params,
                            dir: 1
                        };
                        break;
                    case 'endAttack':
                        this.attack.time = 0;
                        this.attack.dir = -1;
                        break;
                }
            }

            reset() {
                this.hp = this.maxhp;
                this.mana = this.maxhp;
            }

            updateHealth(add) {
                this.hp += add;
            }

            setHealth(value) {
                this.hp = value;
            }
        }

    })()
};
