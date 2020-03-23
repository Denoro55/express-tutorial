import Display from "./Display";

class Game {
    constructor(engine, myPlayerIndex, player1, player2, params) {
        this.canvas = document.querySelector('#game');
        this.ctx = this.canvas.getContext('2d');
        this.engine = engine;
        this.display = new Display(this);
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
        this.firstPlayer = 1;
        this.setCurrentPlayer();
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

            case 'gameOpponentPosition':
                this.opponentPlayer.position = data.num;
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

    setCurrentPlayer() {
        this.currentPlayer = this.firstPlayer === 1 ? this.player1 : this.player2;
        this.currentPlayer.currentOptions.color = 'aqua';
    }

    setBackground(index) {
        const background = new Image();
        background.src = `/static/img/bg/${index}.jpg`;
        this.background = background;
    }

    setPosition(num) {
        if (this.isTurningPlayer() && this.turns < 2) {
            this.myPlayer.position = num - 1;
            this.emit('gameOpponentPosition', {num: num - 1});
        }
    }

    setAIPosition(num) {
        console.log('set position to ', num);
        this.opponentPlayer.position = num;
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
    }

    getCounterattack() {
        const attacks = this.myPlayer.attack.params.counterattack;
        if (!attacks) return false;
        return attacks[Math.floor(Math.random() * attacks.length)];
    }

    getOpponent() {
        return this.currentPlayer === this.player1 ? this.player2 : this.player1;
    }

    getRandom(n) {
        return Math.floor(Math.random() * n);
    }

    makeAITurn() {
        let attempts = true;

        const attacks = this.currentPlayer.controls;
        const keys = Object.keys(attacks);
        let filteredKeys = keys.filter(k => k !== 'KeyL');

        if (this.difficult >= 2) { // средние и тяжелые
            filteredKeys = filteredKeys.filter(k => k !== 'KeyW' && k !== 'KeyS');
            if (this.turns === 0) { // ход первым
                if (this.currentPlayer.energy >= 20) {
                    filteredKeys = filteredKeys.filter(k => k !== 'KeyZ' && k !== 'KeyX' && k !== 'KeyA');
                }
                this.setAIPosition(this.getRandom(3));
            }
        }

        if (this.turns > 0) { // ответный удар позицией
            if (Math.random() < 0.3 * this.difficult) {
                const myPosition = this.myPlayer.position;
                if (myPosition !== this.opponentPlayer.position) {
                    this.setAIPosition(myPosition);
                }
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

            let canProtect = true;

            // position
            const opponent = this.getOpponent(); // тот, кто ходит первый
            // currentPlayer (противник)
            if (opponent.position !== this.currentPlayer.position) {
                canProtect = false;
                if (this.currentPlayer === player1) {
                    continue;
                }
            }

            if (attack1) {
                for (let aa = 0; aa < attack1.attackArea.length; aa++) {
                    if (attack1.attackArea[aa] === attack2.position) {
                        if (attack2.blockType && attack2.blockType === attack1.attackType && canProtect) {
                            const damage = Math.max(0, Math.floor(((-attack1.damage[aa]) + (attack1.damage[aa] * attack2.blockPercentage / 100))));
                            player2.updateHealth(damage);
                        } else {
                            let damage = attack1.damage[aa];
                            if (attack1.weakness && canProtect) {
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
        if (this.singleMode) {
            if (!this.isTurningPlayer()) {
                const delay = restart ? 2000 : 500;
                setTimeout(() => {
                    this.makeAITurn();
                }, delay + Math.random() * 500);
            }
        } else {
            if (this.isTurningPlayer()) {
                this.turnTimer = setTimeout(() => {
                    this.makeTurn('KeyL');
                }, 2500);
            }
        }
    }

    restartGame() {
        this.players.forEach(player => {
            player.reset();
        });
        this.firstPlayer = this.firstPlayer === 1 ? 2 : 1;
        this.setCurrentPlayer();
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
        this.display.render();
    }
}

export default Game;
