export default {
    'enchanted-steel': {
        keyName: 'enchanted-steel',
        iconSrc: 'enchanted-steel.jpg',
        turns: 4,
        effects: {
            armor: {
                activate: (player) => {
                    player.state.armor += 60;
                },
                deactivate: (player) => {
                    player.state.armor -= 60;
                }
            }
        }
    },
    'stun': {
        keyName: 'stun',
        iconSrc: 'stun.png',
        turns: 1,
        effects: {
            skipTurn: {
                activate: (player) => {
                    player.state.skipTurn = true;
                },
                deactivate: (player) => {
                    player.state.skipTurn = false;
                }
            }
        }
    }
};
