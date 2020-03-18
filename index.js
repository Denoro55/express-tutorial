const app = require('./src/app');
const config = require('./config');

const { port } = process.env.PORT || config;

app.listen(port, () => {
    console.log(`server is listening on port ${port}`);
});
