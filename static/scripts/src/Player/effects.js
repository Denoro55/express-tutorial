import generatePassiveAbility from "./helpers/generatePassiveAbility";

export default {
    'stun': (value, player) => {
        const chance = Math.random() < value / 100;
        if (chance) {
            player.prepareAbility(generatePassiveAbility('stun'));
        }
    }
}
