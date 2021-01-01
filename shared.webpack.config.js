const path = require('path')
const merge = require('merge-options')
const TerserPlugin = require('terser-webpack-plugin')

module.exports = function withDefaults(/**@type WebpackConfig*/ extensionConfig) {
    let defaultConfig = {
        optimization: {
            minimizer: [
                new TerserPlugin({
                    extractComments: false,
                }),
            ],
        },
        mode: 'none',
        target: 'node',
        node: {
            __dirname: false,
        },
        resolve: {
            mainFields: ['module', 'main'],
            extensions: ['.ts', '.js'],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: 'ts-loader',
                            options: {
                                compilerOptions: {
                                    sourceMap: true,
                                },
                            },
                        },
                    ],
                },
            ],
        },
        externals: {
            vscode: 'commonjs vscode', // ignored because it doesn't exist
        },
        output: {
            // all output goes into `dist`.
            // packaging depends on that and this must always be like it
            filename: '[name].js',
            path: path.join(extensionConfig.context, 'out'),
            libraryTarget: 'commonjs',
        },
        devtool: 'source-map',
    }

    return merge(defaultConfig, extensionConfig)
}
