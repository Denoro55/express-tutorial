const app = require('./src/app');
const config = require('./config');

const port = process.env.PORT || config.port;

app.listen(port, () => {
    console.log(`server is listening on port ${port}`);
});
