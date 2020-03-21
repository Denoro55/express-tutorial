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
            const data = new FormData(e.target);
            const roomId = data.get('room_id');
            const bgIndex = data.get('room_bg');
            if (roomId) {
                socket.emit('createRoom', { roomId, bgIndex, name });
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

            engine.setBackgroundIndex(data.bgIndex);
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
                this.turns = 0;
                this.turnTimer = null;
                this.playerSettings = {
                    size: {
                        x: 150,
                        y: 200
                    },
                    position: {
                        x: 50,
                        y: 190
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
                    console.log('socket change turn, ', this.turns);

                    const enemyAttack = this.opponentPlayer.controls[data.code];
                    this.prepareAttack(enemyAttack, this.opponentPlayer);

                    if (this.turns >= 2) { // подсчет
                        console.log('turns >= 2');
                    } else {
                        console.log('socket change turn -> change turn');
                        this.changeTurn(this.opponentPlayer, this.myPlayer);
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

                socket.on('gameOpponentAbilities', (data) => {
                    console.log('socket gameOpponentAbilities');
                    console.log(data.abilities)
                    this.opponentPlayer.parseAbilities(data.abilities);
                });

                socket.on('gameEndTurn', () => {
                    console.log('socket gameEndTurn');
                    this.round();
                });
            }

            start(myPlayerIndex, name1, name2, params) {
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
                this.background = document.querySelector(`.game-bg-${params.bgIndex}`);
            }

            setMyPlayer(index) {
                this.myPlayer = index === 1 ? this.player1 : this.player2;
                this.opponentPlayer = index === 1 ? this.player2 : this.player1;
            }

            makeTurn(code) {
                // debug info
                if (code === 'KeyM') {
                    console.log(this);
                    return;
                }

                if (this.isTurningPlayer() && this.turns < 2) {
                    console.log('make turn player', this.currentPlayer.index);
                    const attack = this.myPlayer.controls[code];

                    if (!attack || this.myPlayer.energy < attack.energy) return;
                    if (attack.mana && !this.checkAbilityRequirements(attack, this.myPlayer)) {
                        return;
                    } else {
                        this.myPlayer.prepareAbility(attack);
                    }

                    clearTimeout(this.turnTimer);
                    this.prepareAttack(attack, this.myPlayer);

                    engine.emitToRoom('gameChangeTurn', {attackCode: code});

                    if (this.turns >= 2) { // подсчет
                        this.endTurns();
                    } else {
                        this.changeTurn(this.myPlayer, this.opponentPlayer);
                    }
                } else {
                    // console.log('cant make turn');
                }
            }

            checkAbilityRequirements(attack, player) {
                if (player.mana < attack.mana) {
                    return false;
                }
                if (attack.turns && this.turns !== attack.turns) {
                    return false;
                }
                return true;
            }

            prepareAttack(attack, player) {
                this.turns += 1;
                player.setState('attack', attack);
                player.energy -= attack.energy;
                if (attack.mana) {
                    player.mana -= attack.mana;
                }
                player.updateState();
            }

            changeTurn(currentPlayer, otherPlayer) {
                console.log('change turn, turns: ', this.turns);
                // this.currentPlayer.currentOptions.color = this.currentPlayer.options.color;
                // this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
                // this.currentPlayer.currentOptions.color = 'aqua';
                currentPlayer.currentOptions.color = currentPlayer.options.color;
                this.currentPlayer = otherPlayer;
                otherPlayer.currentOptions.color = 'aqua';
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
                            this.round();
                            engine.emitToRoom('gameEndTurn');
                        }, 600);
                    }, 600);
                }, 1000);
            }

            round() {
                this.turns = 0;
                this.myPlayer.updateAbilities();
                this.checkWinner();
                engine.emitToRoom('gameOpponentAbilities', {abilities: this.myPlayer.getAbilities()});
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
                        for (let aa = 0; aa < attack1.attackArea.length; aa++) {
                            if (attack1.attackArea[aa] === attack2.position) {
                                if (attack2.blockType && attack2.blockType === attack1.attackType) {
                                    const damage = Math.max(0, Math.floor(((-attack1.damage[aa]) + (attack1.damage[aa] * attack2.blockPercentage / 100))));
                                    player2.updateHealth(damage);
                                } else {
                                    const armor = attack1.damage[aa] * player2.armor / 100;
                                    player2.updateHealth(Math.floor(-attack1.damage[aa] + armor));
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
                ctx.drawImage(this.background, 0, 0);
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
                        this.drawCells(ctx, {
                            x: player.position.x,
                            y: player.position.y + player.size.y
                        }, currentPlayer)
                    } else { // player 2
                        this.drawPlayer(ctx, {
                            player: currentPlayer,
                            imageX: this.gameWidth - player.position.x - player.size.x,
                            posX: this.gameWidth - player.position.x - player.size.x,
                            barX: (this.gameWidth - player.position.x - player.size.x) - player.position.x,
                            attackDir: -1
                        });
                        this.drawCells(ctx, {
                            x: this.gameWidth - player.position.x - player.size.x,
                            y: player.position.y + player.size.y
                        }, currentPlayer)
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
                    y: player.position.y - 10,
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

            drawCells(ctx, position, currentPlayer) {
                Object.keys(currentPlayer.abilities).forEach((e, idx) => {
                    ctx.drawImage(currentPlayer.abilities[e].img, position.x + (idx * 55), position.y + 15, 40, 40);
                });

                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = "1";
                    ctx.rect(position.x + (i * 55), position.y + 15, 40, 40);
                    ctx.stroke();
                }
            }

            drawBars(ctx, offsetX, currentPlayer) {
                const player = this.playerSettings;
                const barDistance = 31;
                const startPositionY = player.position.y - 5;

                const healthPosition = {x: offsetX + player.position.x, y: startPositionY - barDistance * 3};
                const energyPosition = {x: offsetX + player.position.x, y: startPositionY - barDistance * 2};
                const manaPosition = {x: offsetX + player.position.x, y: startPositionY - barDistance};

                ctx.textAlign = "left";

                this.drawBar(ctx, healthPosition,
                    {
                        firstColor: 'red',
                        mainColor: '#078c07',
                        player, currentPlayer,
                        values: [currentPlayer.hp, currentPlayer.maxhp]
                    });
                this.drawBar(ctx, energyPosition,
                    {
                        firstColor: '#ddd',
                        mainColor: '#38a0d2',
                        player, currentPlayer,
                        values: [currentPlayer.energy, currentPlayer.maxenergy]
                    });
                this.drawBar(ctx, manaPosition,
                    {
                        firstColor: '#ddd',
                        mainColor: '#19287b',
                        player, currentPlayer,
                        values: [currentPlayer.mana, currentPlayer.maxmana]
                    });
            }

            drawBar(ctx, position, params) {
                ctx.beginPath();
                ctx.fillStyle = params.firstColor;
                ctx.rect(position.x, position.y, params.player.size.x, params.player.health.size);
                ctx.fill();

                ctx.beginPath();
                ctx.fillStyle = params.mainColor;
                ctx.rect(position.x, position.y, Math.max(0, params.player.size.x * (params.values[0] / params.values[1])), params.player.health.size);
                ctx.fill();

                ctx.font = "12px Arial";
                ctx.fillStyle = "#fff";
                ctx.fillText(params.values[0] + "/" + params.values[1], position.x + 5, position.y + 16);

                ctx.beginPath();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = "1";
                ctx.rect(position.x, position.y, params.player.size.x, params.player.health.size);
                ctx.stroke();
            }
        }

        class Player {
            constructor(options) {
                this.name = options.name;
                this.setSkin(options.skin);
                this.wins = 0;
                this.maxhp = 150;
                this.hp = this.maxhp;
                this.maxmana = 50;
                this.mana = this.maxmana;
                this.maxenergy = 80;
                this.manaRegen = 5;
                this.energy = this.maxenergy;
                this.energyRegen = 10;
                this.armor = 0;
                this.index = options.index;
                this.preparedAbilities = [];
                this.abilities = {};
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
                this.passiveAbilities = {
                    'enchanted-steel': {
                        keyName: 'enchanted-steel',
                        iconSrc: 'enchanted-steel.jpg',
                        turns: 3,
                        effects: {
                            armor: 50
                        }
                    }
                };
                this.controls = {
                    'KeyW': {
                        damage: [0],
                        attackArea: [-1],
                        position: 0,
                        energy: -10,
                        name: 'Прыжок'
                    },
                    'KeyS': {
                        damage: [0],
                        attackArea: [-1],
                        position: 2,
                        energy: -10,
                        name: 'Присед'
                    },
                    'KeyA': {
                        damage: [15],
                        attackArea: [0],
                        attackType: 1,
                        position: 0,
                        energy: 20,
                        name: 'Захват в прыжке'
                    },
                    'KeyF': {
                        damage: [10, 20],
                        attackArea: [0, 1],
                        attackType: 1,
                        position: 1,
                        energy: 20,
                        name: 'Удар в голову'
                    },
                    'KeyG': {
                        damage: [10, 20],
                        attackArea: [1, 2],
                        attackType: 1,
                        position: 1,
                        energy: 20,
                        name: 'Удар с ноги'
                    },
                    'KeyH': {
                        damage: [15, 5],
                        attackArea: [1, 0],
                        attackType: 1,
                        position: 0,
                        energy: 20,
                        name: 'Удар в прыжке'
                    },
                    'KeyJ': {
                        damage: [15, 5],
                        attackArea: [1, 2],
                        attackType: 3,
                        position: 2,
                        energy: 20,
                        name: 'Подножка'
                    },
                    'KeyZ': {
                        damage: [0],
                        attackArea: [-1],
                        position: 1,
                        blockType: 1,
                        blockPercentage: 100,
                        energy: -10,
                        name: 'Блок'
                    },
                    'KeyX': {
                        damage: [0],
                        attackArea: [-1],
                        position: 2,
                        blockType: 3,
                        blockPercentage: 100,
                        energy: -10,
                        name: 'Нижний блок'
                    },
                    'KeyL': {
                        damage: [0],
                        attackArea: [-1],
                        position: 1,
                        energy: -10,
                        name: 'Ничего не делать'
                    },
                    'KeyQ': {
                        damage: [50],
                        attackArea: [1],
                        attackType: 1,
                        position: 1,
                        energy: 20,
                        mana: 35,
                        turns: 0,
                        type: 'active',
                        name: 'Силовой удар'
                    },
                    'KeyE': {
                        damage: [0],
                        attackArea: [-1],
                        position: 1,
                        energy: 10,
                        mana: 35,
                        type: 'passive',
                        options: this.passiveAbilities['enchanted-steel'],
                        name: 'Зачарованная сталь'
                    },
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
                this.mana = this.maxmana;
                this.energy = this.maxenergy;
                this.currentOptions.color = this.options.color;
            }

            updateState() {
                this.energy = Math.min(this.energy + this.energyRegen, this.maxenergy);
                this.mana = Math.min(this.mana + this.manaRegen, this.maxmana);
            }

            prepareAbility(attack) {
                if (attack.type === 'passive') {
                    this.preparedAbilities.push(attack);
                }
            }

            applyAbility(ability) {
                const img = new Image;
                img.src = '/static/img/abilities/' + ability.options.iconSrc;

                this.abilities[ability.options.keyName] = {
                    turns: ability.options.turns,
                    img,
                    iconSrc: ability.options.iconSrc,
                    effects: {...ability.options.effects}
                };

                Object.keys(ability.options.effects).forEach(key => {
                    this[key] += ability.options.effects[key];
                })
            }

            removeAbility(ability) {
                const thisAbility = this.abilities[ability];
                Object.keys(thisAbility.effects).forEach(key => {
                    this[key] -= thisAbility.effects[key]
                });
                delete this.abilities[ability];
            }

            updateAbilities() {
                Object.keys(this.abilities).forEach(key => {
                    const turns = this.abilities[key].turns -= 1;
                    if (turns <= 0) {
                        this.removeAbility(key);
                    }
                });

                this.preparedAbilities.forEach(ability => {
                    this.applyAbility(ability);
                });

                this.preparedAbilities = [];
            }

            getAbilities() {
                return Object.keys(this.abilities);
            }

            parseAbilities(abilities) {
                abilities.forEach(abilityName => {
                    if (!this.abilities.hasOwnProperty(abilityName)) {
                        const ability = this.passiveAbilities[abilityName];
                        const img = new Image;
                        img.src = '/static/img/abilities/' + ability.iconSrc;
                        Object.keys(ability.effects).forEach(key => {
                            this[key] += ability.effects[key];
                        });
                        this.abilities[abilityName] = {
                            img
                        }
                    }
                });

                Object.keys(this.abilities).forEach(abilityName => {
                    if (!abilities.includes(abilityName)) {
                        const ability = this.passiveAbilities[abilityName];
                        Object.keys(ability.effects).forEach(key => {
                            this[key] -= ability.effects[key];
                        });
                        delete this.abilities[abilityName];
                    }
                })
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

            setBackgroundIndex(index) {
                this.bgIndex = index;
            }

            setRoomId(id) {
                this.roomId = id;
            }

            startGame(myPlayerIndex, name1, name2) {
                this.game.start(myPlayerIndex, name1, name2, {bgIndex: this.bgIndex});

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
