import Player from "./Player";

class Golem extends Player {
    constructor(options) {
        super(options);
        this.boss = true;
        this.maxhp = 200;
        this.hp = 200;
        this.options.color = '#ff5722';
        this.currentOptions = {
            color: this.options.color
        };
        this.setSkin('boss/golem.png');
        this.AIOptions = {
            counterAttackChance: 60
        };
        this.controls = {
            'KeyF': {
                damage: [30],
                attackArea: [1],
                attackType: 1,
                position: 1,
                energy: 20,
                effects: {
                    stun: 15
                },
                name: 'Прямой удар'
            },
            'KeyG': {
                id: 'golem-a2',
                damage: [20, 20],
                attackArea: [1, 2],
                position: 1,
                energy: 20,
                name: 'Удар по земле'
            },
            'KeyH': {
                damage: [20],
                attackArea: [0],
                position: 1,
                energy: 20,
                name: 'Взмах молота'
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
                keyName: 'KeyX',
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
            }
        };

        this.counterAttacks = {
            'KeyF': ['KeyF', 'KeyG'],
            'KeyG': ['KeyF', 'KeyG'],
            'KeyJ': ['KeyG'],
            'KeyH': ['KeyH'],
            'KeyA': ['KeyH'],
        }
    }
}

export default Golem;
