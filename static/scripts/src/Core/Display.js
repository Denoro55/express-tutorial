import playerSettings from "../helpers/playerSettings";
import getAttackPosition from "../helpers/getAttackPosition";

class Display {
    constructor(game) {
        this.canvas = document.querySelector('#game');
        this.ctx = this.canvas.getContext('2d');
        this.gameWidth = this.canvas.width;
        this.gameHeight = this.canvas.height;
        this.game = game;
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.gameWidth, this.gameHeight);
        this.drawBackground(ctx);
        this.drawText(ctx);
        this.drawPlayers(ctx);
    }

    drawBackground(ctx) {
        ctx.globalAlpha = .6;
        ctx.drawImage(this.game.background, 0, 0);
        ctx.globalAlpha = 1;
    }

    drawText(ctx) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText(this.game.player1.getName() + ' против ' + this.game.player2.getName(), this.gameWidth / 2, 40);
        ctx.font = "12px Arial";
        ctx.fillText(this.game.player1.getWins() + ':' + this.game.player2.getWins(), this.gameWidth / 2, 60);
    }

    drawPlayers(ctx) {
        const player = playerSettings;

        for (let i = 0; i < 2; i++) {
            const currentPlayer = i === 0 ? this.game.player1 : this.game.player2;
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
                }, currentPlayer);
                this.drawPoints(ctx, {
                    x: player.position.x + player.size.x + 25,
                    y: player.position.y + player.size.y / 2
                }, currentPlayer);
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
                }, currentPlayer);
                this.drawPoints(ctx, {
                    x: this.gameWidth - player.position.x - player.size.x - 25,
                    y: player.position.y + player.size.y / 2
                }, currentPlayer);
            }
        }
    }

    drawPlayer(ctx, params) {
        const player = playerSettings;
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

        // attack block
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

    drawPoints(ctx, position, currentPlayer) {
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.fillStyle = currentPlayer.position === i ? 'green' : '#8c8c8c';
            ctx.lineWidth = "1";
            ctx.arc(position.x, position.y - 27 + (i * 27), 7, 0, 2 * Math.PI);
            ctx.fill();
        }

        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = "1";
            ctx.arc(position.x, position.y - 27 + (i * 27), 7, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }

    drawBars(ctx, offsetX, currentPlayer) {
        const player = playerSettings;
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

export default Display;
