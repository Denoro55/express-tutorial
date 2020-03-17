module.exports = class extends Error {
    constructor(...params) {
        super(...params);
        this.status = 404;
    }
};
