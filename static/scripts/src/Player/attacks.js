import passiveAbilities from "./passiveAbilities";

export default {
    'KeyW': {
        keyName: 'KeyW',
        damage: [0],
        attackArea: [-1],
        position: 0,
        energy: -10,
        name: 'Прыжок'
    },
    'KeyS': {
        keyName: 'KeyS',
        damage: [0],
        attackArea: [-1],
        position: 2,
        energy: -10,
        name: 'Присед'
    },
    'KeyF': {
        keyName: 'KeyF',
        id: 0,
        damage: [20],
        attackArea: [1],
        attackType: 1,
        position: 1,
        energy: 20,
        name: 'Удар в голову'
    },
    'KeyG': {
        keyName: 'KeyG',
        id: 1,
        damage: [20, 20],
        attackArea: [1, 2],
        attackType: 1,
        position: 1,
        energy: 20,
        weakness: [{
            id: 0,
            damage: -20
        }],
        name: 'Удар с ноги'
    },
    'KeyJ': {
        keyName: 'KeyJ',
        id: 2,
        damage: [20, 5],
        attackArea: [1, 2],
        attackType: 3,
        position: 2,
        energy: 20,
        weakness: [
            {id: 1, damage: -20},
            {id: 'golem-a2', damage: -30}
        ],
        name: 'Подножка'
    },
    'KeyH': {
        keyName: 'KeyH',
        id: 3,
        damage: [20, 15],
        attackArea: [0, 1],
        attackType: 1,
        position: 0,
        energy: 20,
        weakness: [
            {
                id: 5, // удар с низа
                damage: -15
            },
            {
                id: 4, // захват в прыжке
                damage: -20
            }
        ],
        name: 'Удар в прыжке'
    },
    'KeyA': {
        keyName: 'KeyA',
        id: 4,
        damage: [20],
        attackArea: [0],
        attackType: 1,
        position: 0,
        energy: 20,
        name: 'Захват в прыжке'
    },
    'KeyD': {
        keyName: 'KeyD',
        id: 5,
        damage: [20],
        attackArea: [0],
        attackType: 1,
        position: 1,
        energy: 20,
        name: 'Удар с низа'
    },
    'KeyZ': {
        keyName: 'KeyZ',
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
        keyName: 'KeyL',
        damage: [0],
        attackArea: [-1],
        position: 1,
        energy: -10,
        name: 'Ничего не делать'
    },
    'KeyQ': {
        keyName: 'KeyQ',
        damage: [60],
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
        keyName: 'KeyE',
        damage: [0],
        attackArea: [-1],
        position: 1,
        energy: 10,
        mana: 35,
        type: 'passive',
        options: passiveAbilities['enchanted-steel'],
        name: 'Зачарованная сталь'
    },
};
