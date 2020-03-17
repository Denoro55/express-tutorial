module.exports = class {
    constructor(nickname, passwordDigest) {
        this.nickname = nickname;
        this.passwordDigest = passwordDigest || 'forbidden';
        this.guest = false;
    }

    isGuest() {
        return this.guest;
    }

    getName() {
        return this.nickname;
    }
};
