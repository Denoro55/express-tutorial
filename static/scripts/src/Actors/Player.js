import attacks from "../Player/attacks";

class Player {
    constructor(options) {
        this.name = options.name;
        this.setSkin(options.skin);
        this.boss = false;
        this.wins = 0;
        this.maxhp = 150;
        this.hp = this.maxhp;
        this.maxmana = 50;
        this.mana = this.maxmana;
        this.maxenergy = 80;
        this.manaRegen = 5;
        this.energy = this.maxenergy;
        this.energyRegen = 10;
        this.state = {
            armor: 0,
            skipTurn: false
        };
        // this.armor = 0;
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

        this.controls = attacks;

        this.counterAttacks = {
            'KeyW': ['KeyD', 'KeyA'],
            'KeyS': ['KeyG'],
            'KeyF': ['KeyJ'],
            'KeyG': ['KeyF'],
            'KeyH': ['KeyD'],
            'KeyJ': ['KeyG'],
            'KeyA': ['KeyD'],
            'KeyD': ['KeyF', 'KeyG', 'KeyJ'],
            'KeyZ': ['KeyJ'],
            'KeyX': ['KeyG'],
            // 'KeyL': ['KeyG'],
            'KeyQ': ['KeyJ', 'KeyH'],
            'KeyE': ['KeyJ', 'KeyH', 'KeyF', 'KeyG'],
        };

        // вызов программой
        this.actions = {
            'stun': {
                keyName: 'KeyL',
                damage: [0],
                attackArea: [-1],
                position: 1,
                energy: -10,
                name: 'Оглушен'
            }
        }
    }

    setSkin(src) {
        if (!src) return;

        const image = new Image();
        image.src = '/static/img/skins/' + src;
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
            ability.options.effects[key].activate(this);
        })
    }

    removeAbility(ability) {
        const thisAbility = this.abilities[ability];
        Object.keys(thisAbility.effects).forEach(key => {
            thisAbility.effects[key].deactivate(this);
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

    getCounterattacks(code) {
        const availableCounterAttacks = this.counterAttacks[code];
        if (!availableCounterAttacks) {
            return [];
        }
        return availableCounterAttacks;
    }

    getAttack(code) {
        let attack = this.controls[code];
        if (!attack) {
            attack = this.actions[code];
        }
        return attack;
    }

    addHealth(add) {
        this.hp += add;
    }

    setHealth(value) {
        this.hp = value;
    }
}

export default Player;
