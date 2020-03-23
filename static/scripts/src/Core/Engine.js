import Game from "./Game";

const digitsKeys = {
    'Digit1': 1,
    'Digit2': 2,
    'Digit3': 3
};

class Engine {
    constructor(socket) {
        this.game = null;
        this.play = false;
        this.roomId = null;
        this.socket = socket;

        document.addEventListener('keydown', (event) => {
            // console.log(event.code);
            const digit = digitsKeys[event.code];
            if (digit) {
                this.setPlayerPosition(digit);
            } else {
                this.makeTurn(event.code);
            }
        });

        window.onblur = () => {
            this.pauseGame();
        };

        window.onfocus = () => {
            this.continueGame();
        };

        // sockets
        this.socket.on('gameChangeTurn', (data) => {
            this.game.onSocketEvent('gameChangeTurn', data);
        });

        this.socket.on('gameEndCalculating', (data) => {
            this.game.onSocketEvent('gameEndCalculating', data);
        });

        this.socket.on('gameEndAttack', () => {
            this.game.onSocketEvent('gameEndAttack');
        });

        this.socket.on('gameOpponentAbilities', (data) => {
            this.game.onSocketEvent('gameOpponentAbilities', data);
        });

        this.socket.on('gameOpponentPosition', (data) => {
            this.game.onSocketEvent('gameOpponentPosition', data);
        });

        this.socket.on('gameEndTurn', () => {
            this.game.onSocketEvent('gameEndTurn');
        });
    }

    startGame(myPlayerIndex, player1, player2, params) {
        this.game = new Game(this, myPlayerIndex, player1, player2, params);
        this.roomId = params.roomId;

        if (!this.play) {
            this.run();
            this.play = true;
        }
    }

    makeTurn(code) {
        if (this.play) {
            this.game.makeTurn(code);
        }
    }

    setPlayerPosition(num) {
        if (this.play) {
            this.game.setPosition(num);
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
            this.socket.emit(url, data);
        }
    }
}

export default Engine;
