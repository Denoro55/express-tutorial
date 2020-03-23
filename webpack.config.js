const path = require('path');

const isDev = process.env.NODE_ENV === 'production';

module.exports = {
    entry: './static/scripts/src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'static/scripts/dist')
    },
    devServer: {
        contentBase: './static/scripts/dist',
    },
    devtool: isDev ? 'source-map' : '',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: ['@babel/plugin-proposal-class-properties']
                    }
                }
            },
        ]
    }
};
