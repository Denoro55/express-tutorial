import passiveAbilities from "../passiveAbilities";

export default (key) => {
    return {
        type: 'passive',
        options: passiveAbilities[key]
    }
}
