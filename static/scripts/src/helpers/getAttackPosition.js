export default {
    1: (options) => {
        return {
            x: options.x + (options.attackStartTime - options.currentAttackTime),
            y: options.y + 50
        }
    },
    2: (options) => {
        return {
            x: options.x - 50 - (options.attackStartTime - options.currentAttackTime),
            y: options.y + 120
        }
    }
};
