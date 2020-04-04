import Game from "../static/scripts/src/Core/Game";
import Player from "../static/scripts/src/Actors/Player";
import Golem from "../static/scripts/src/Actors/Golem";

test('Game init', () => {
    const player = new Player({
        name: 'Player 1',
        skin: '1.jpg',
        index: 1
    });

    const player2 = new Golem({
        name: 'Player 2',
        index: 2
    });

    // const player2 = new Player({
    //     name: 'Player 2',
    //     skin: '2.jpg',
    //     index: 2
    // });

    const game = new Game(null, 1, player, player2, {
        bgIndex: 1,
        singleMode: true,
        difficult: 3,
        test: true
    });

    expect(game.currentPlayer.getName()).toBe('Player 1');
    expect(game.opponentPlayer.getName()).toBe('Player 2');

    // // player 1 turns
    // game.makeTurn('KeyG');
    //
    // expect(game.currentPlayer.getName()).toBe('Player 2');
    // expect(game.turns).toBe(1);
    //
    // // player 2 turns
    // game.makeTurn('KeyG', true);
    //
    // expect(game.turns).toBe(0);
    // expect(game.player1.hp).toBe(130);
    // expect(game.player2.hp).toBe(180);

    // expect(game.currentPlayer.getName()).toBe('Player 2');
    //
    // // player 2 turns
    // game.makeTurn('KeyF', true);
    //
    // expect(game.currentPlayer.getName()).toBe('Player 1');
    //
    // // player 1 turns
    // game.makeTurn('KeyF');
    //
    // expect(game.player1.hp).toBe(100);
    // expect(game.player2.hp).toBe(160);

    // await new Promise((resolve => {
    //     setTimeout(() => {
    //         resolve();
    //     }, 1000);
    // }));

});
