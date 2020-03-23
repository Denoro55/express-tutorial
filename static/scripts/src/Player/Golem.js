import Player from "./Player";

class Golem extends Player {
    constructor(options) {
        super(options);
        this.maxhp = 200;
        this.hp = 200;
        this.controls = {
            // [area, position]: 0 jump, 1 stay, 2 sit
            'KeyF': {
                damage: [30],
                attackArea: [1],
                attackType: 1,
                position: 1,
                energy: 20,
                // counterattack: ['KeyJ'], ???
                name: 'Прямой удар'
            },
            'KeyZ': {
                damage: [0],
                attackArea: [-1],
                position: 1,
                blockType: 1,
                blockPercentage: 100,
                energy: -10,
                // counterattack: ['KeyJ'],
                name: 'Блок'
            },
            'KeyL': {
                damage: [0],
                attackArea: [-1],
                position: 1,
                energy: -10,
                name: 'Ничего не делать'
            },
        }
    }
}

export default Golem;
