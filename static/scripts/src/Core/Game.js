import Player from "../Player/Player";

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
    static playerSettings = {
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

    constructor(engine, myPlayerIndex, player1, player2, params) {
        this.canvas = document.querySelector('#game');
        this.ctx = this.canvas.getContext('2d');
        this.engine = engine;
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
        this.turns = 0;
        this.turnTimer = null;
        this.singleMode = params.singleMode || false;
        this.difficult = Number(params.difficult) || 1;
        this.player1 = player1;
        this.player2 = player2;
        this.players = [this.player1, this.player2];
        this.setMyPlayer(myPlayerIndex);
        this.currentPlayer = this.player1;
        this.currentPlayer.currentOptions.color = 'aqua';
        this.setBackground(params.bgIndex);
    }

    onSocketEvent(name, data) {
        switch (name) {
            case 'gameChangeTurn':
                console.log('socket change turn, ', this.turns);

                const enemyAttack = this.opponentPlayer.controls[data.code];
                this.prepareAttack(enemyAttack, this.opponentPlayer);

                if (this.turns < 2) {
                    this.changeTurn(this.opponentPlayer, this.myPlayer);
                    this.turnTimer = setTimeout(() => {
                        this.makeTurn('KeyL');
                    }, 1500);
                }

                break;

            case 'gameEndCalculating':
                this.player1.setHealth(data.health1);
                this.player2.setHealth(data.health2);
                break;

            case 'gameEndAttack':
                console.log('socket gameEndAttack');
                this.players.forEach(player => {
                    player.setState('endAttack', player.attack.params);
                });
                break;

            case 'gameOpponentAbilities':
                console.log('socket gameOpponentAbilities');
                console.log(data.abilities);
                this.opponentPlayer.parseAbilities(data.abilities);
                break;

            case 'gameEndTurn':
                console.log('socket gameEndTurn');
                this.round();
                break;
        }
    }

    setMyPlayer(index) {
        this.myPlayer = index === 1 ? this.player1 : this.player2;
        this.opponentPlayer = index === 1 ? this.player2 : this.player1;
    }

    setBackground(index) {
        const background = new Image();
        background.src = `/static/img/bg/${index}.jpg`;
        this.background = background;
    }

    makeTurn(code) {
        // debug info
        if (code === 'KeyM') {
            console.log(this);
            return;
        }

        if (this.isTurningPlayer() && this.turns < 2) {
            console.log('make turn player', this.currentPlayer.index, this.singleMode);

            const attack = this.myPlayer.controls[code];
            if (!this.myPlayer.isAttackAvailable(attack)) return;

            clearTimeout(this.turnTimer);
            this.prepareAttack(attack, this.myPlayer);

            this.emit('gameChangeTurn', { attackCode: code });
            this.endTurn();

        } else {
            // console.log('cant make turn');
        }
    }

    endTurn() {
        if (this.turns >= 2) { // подсчет
            this.endTurns();
        } else {
            if (this.singleMode) {
                this.changeTurn(this.currentPlayer);
                if (!this.isTurningPlayer()) {
                    setTimeout(() => {
                        this.makeAITurn();
                    }, 500 + Math.random() * 500);
                } else {
                    this.turnTimer = setTimeout(() => {
                        this.makeTurn('KeyL');
                    }, 1500);
                }
            } else {
                this.changeTurn(this.myPlayer, this.opponentPlayer);
            }
        }
    }

    changeTurn(currentPlayer, otherPlayer) {
        console.log('change turn, turns: ', this.turns);
        currentPlayer.currentOptions.color = currentPlayer.options.color;
        if (otherPlayer !== undefined) {
            this.currentPlayer = otherPlayer;
            otherPlayer.currentOptions.color = 'aqua';
        } else {
            this.currentPlayer = this.currentPlayer === this.player1 ? this.player2 : this.player1;
            this.currentPlayer.currentOptions.color = 'aqua';
        }
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
                this.emit('gameEndAttack');
                setTimeout(() => {
                    this.round();
                    this.emit('gameEndTurn');
                }, 600);
            }, 600);
        }, 1000);
    }

    round() {
        this.turns = 0;
        if (this.singleMode) {
            this.players.forEach(player => {
                player.updateAbilities();
            })
        } else {
            this.myPlayer.updateAbilities();
        }
        this.checkWinner();
        this.emit('gameOpponentAbilities', {abilities: this.myPlayer.getAbilities()});
        if (this.singleMode && !this.isTurningPlayer()) {
            setTimeout(() => {
                this.makeAITurn();
            }, 500 + Math.random() * 500);
        }
    }

    getCounterattack() {
        const attacks = this.myPlayer.attack.params.counterattack;
        if (!attacks) return false;
        return attacks[Math.floor(Math.random() * attacks.length)];
    }

    makeAITurn() {
        let attempts = true;

        const attacks = this.currentPlayer.controls;
        const keys = Object.keys(attacks);
        let filteredKeys = keys.filter(k => k !== 'KeyL');

        if (this.difficult >= 2) {
            filteredKeys = filteredKeys.filter(k => k !== 'KeyW' && k !== 'KeyS');
            if (this.turns === 0 && this.currentPlayer.energy >= 20) { // ход первым
                filteredKeys = filteredKeys.filter(k => k !== 'KeyZ' && k !== 'KeyX' && k !== 'KeyA');
            }
        }

        while (attempts) {
            let attackKey;
            attackKey = filteredKeys[Math.floor(Math.random() * filteredKeys.length)];

            if (this.difficult >= 2) { // medium
                if (this.turns === 1 && this.currentPlayer.energy >= 20) { // ответный удар
                    if (Math.random() < .35 * (this.difficult - 1)) {
                        if (this.getCounterattack()) {
                            attackKey = this.getCounterattack();
                        }
                    }
                }
            }

            const attack = this.currentPlayer.controls[attackKey];
            // console.log(keys);

            if (this.currentPlayer.isAttackAvailable(attack)) {
                attempts = false;
                this.prepareAttack(attack, this.currentPlayer);
                this.endTurn();
            } else {
                console.log('try again');
                filteredKeys = filteredKeys.filter(k => k !== attackKey);
            }
        }
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

    emit(name, params) {
        if (!this.singleMode) {
            this.engine.emitToRoom(name, params);
        }
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
                            let damage = attack1.damage[aa];
                            if (attack1.weakness) {
                                attack1.weakness.forEach(e => {
                                    if (e.id === attack2.id) {
                                        damage += e.damage;
                                    }
                                });
                            }
                            const armor = damage * player2.armor / 100;
                            player2.updateHealth(Math.floor(-damage + armor));
                        }
                        break;
                    }
                }
            }
        }

        this.emit('gameEndCalculating', {health1: player2.hp, health2: player1.hp});
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
        // ctx.globalAlpha = .8;
        ctx.drawImage(this.background, 0, 0);
        // ctx.globalAlpha = 1;
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
        const player = this.constructor.playerSettings;

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
        const player = this.constructor.playerSettings;
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
        const player = this.constructor.playerSettings;
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

export default Game;
