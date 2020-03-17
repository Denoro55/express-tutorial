const path = require('path');

module.exports = {
    port: 3000,
    db: {
        users: path.join(__dirname, '..', 'db', 'users.json')
    }
};
