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
        this.position = 0;
        this.index = options.index;
        this.preparedAbilities = [];
        this.abilities = {};
        this.options = {
            color: '#fff',
            attack: {
                width: 200,
                height: 50,
                startTime: 215,
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
                turns: 4,
                effects: {
                    armor: 60
                }
            }
        };
        this.controls = {
            // [area, position]: 0 jump, 1 stay, 2 sit
            'KeyW': {
                damage: [0],
                attackArea: [-1],
                position: 0,
                energy: -10,
                counterattack: ['KeyD', 'KeyA'],
                name: 'Прыжок'
            },
            'KeyS': {
                damage: [0],
                attackArea: [-1],
                position: 2,
                energy: -10,
                counterattack: ['KeyG'],
                name: 'Присед'
            },
            'KeyF': {
                id: 0,
                damage: [20],
                attackArea: [1],
                attackType: 1,
                position: 1,
                energy: 20,
                counterattack: ['KeyJ'],
                name: 'Удар в голову'
            },
            'KeyG': {
                id: 1,
                damage: [20, 20],
                attackArea: [1, 2],
                attackType: 1,
                position: 1,
                energy: 20,
                counterattack: ['KeyF'],
                weakness: [{
                    id: 0,
                    damage: -20
                }],
                name: 'Удар с ноги'
            },
            'KeyJ': {
                id: 2,
                damage: [20, 5],
                attackArea: [1, 2],
                attackType: 3,
                position: 2,
                energy: 20,
                counterattack: ['KeyG'],
                weakness: [{
                    id: 1,
                    damage: -20
                }],
                name: 'Подножка'
            },
            'KeyH': {
                id: 3,
                damage: [20, 15],
                attackArea: [0, 1],
                attackType: 1,
                position: 0,
                energy: 20,
                counterattack: ['KeyD'],
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
                id: 4,
                damage: [20],
                attackArea: [0],
                attackType: 1,
                position: 0,
                energy: 20,
                counterattack: ['KeyD'],
                name: 'Захват в прыжке'
            },
            'KeyD': {
                id: 5,
                damage: [20],
                attackArea: [0],
                attackType: 1,
                position: 1,
                energy: 20,
                counterattack: ['KeyF', 'KeyG', 'KeyJ'],
                name: 'Удар с низа'
            },
            'KeyZ': {
                damage: [0],
                attackArea: [-1],
                position: 1,
                blockType: 1,
                blockPercentage: 100,
                energy: -10,
                counterattack: ['KeyJ'],
                name: 'Блок'
            },
            'KeyX': {
                damage: [0],
                attackArea: [-1],
                position: 2,
                blockType: 3,
                blockPercentage: 100,
                energy: -10,
                counterattack: ['KeyG'],
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
                damage: [60],
                attackArea: [1],
                attackType: 1,
                position: 1,
                energy: 20,
                mana: 35,
                turns: 0,
                type: 'active',
                counterattack: ['KeyJ', 'KeyH'],
                name: 'Силовой удар'
            },
            'KeyE': {
                damage: [0],
                attackArea: [-1],
                position: 1,
                energy: 10,
                mana: 35,
                type: 'passive',
                counterattack: ['KeyJ', 'KeyH', 'KeyF'],
                options: this.passiveAbilities['enchanted-steel'],
                name: 'Зачарованная сталь'
            },
        }
    }

    setSkin(src) {
        const image = new Image();
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
        this.abilities = {};
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

    isAttackAvailable(attack) {
        if (!attack || this.energy < attack.energy) return false;
        if (attack.mana && !this.isAbilityAvailable(attack)) {
            return false;
        } else {
            this.prepareAbility(attack); // побочный эффект
        }
        return true;
    }

    isAbilityAvailable(attack) {
        if (this.mana < attack.mana) {
            return false;
        }
        if (attack.turns && this.turns !== attack.turns) {
            return false;
        }
        return true;
    }

    updateHealth(add) {
        this.hp += add;
    }

    setHealth(value) {
        this.hp = value;
    }
}

export default Player;
