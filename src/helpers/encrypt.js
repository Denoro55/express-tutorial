const crypto = require('crypto');

module.exports = (text) => {
    const hash = crypto.createHmac('sha512', 'salt');
    hash.update(text);
    return hash.digest('hex');
};
