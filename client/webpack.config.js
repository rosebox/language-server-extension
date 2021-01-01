const withDefaults = require('../shared.webpack.config')
const path = require('path')
const LicenseCheckerWebpackPlugin = require('license-checker-webpack-plugin')

module.exports = withDefaults({
    context: path.join(__dirname),
    entry: {
        extension: './src/extension.ts',
    },
    output: {
        filename: 'extension.js',
        path: path.join(__dirname, '../dist'),
    },
    plugins: [
        new LicenseCheckerWebpackPlugin({
            outputFilename: '../ThirdPartyNotices.extension.txt',
            allow: '(Apache-2.0 OR BSD-2-Clause OR BSD-3-Clause OR MIT OR ISC)',
        }),
    ],
})
