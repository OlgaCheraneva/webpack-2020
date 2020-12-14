const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const OptimizeCssAssetWebpackPlugin = require('optimize-css-assets-webpack-plugin');
const TerserWebpackPlugin = require('terser-webpack-plugin');
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');

const isDev = process.env.NODE_ENV === 'development';
const isProd = !isDev;

const optimization = () => {
    // Это указывает, какие фрагменты будут выбраны для оптимизации.
    // Допустимыми строковыми значениями являются all, async и initial.
    // Значение all может быть особенно эффективным, потому что это означает,
    // что куски могут совместно использоваться даже между асинхронными и неасинхронными фрагментами.
    const config = {
        splitChunks: {
            chunks: 'all',
        },
    };

    if (isProd) {
        config.minimizer = [
            // Минификация CSS с помощью cssnano.
            new OptimizeCssAssetWebpackPlugin(),
            // Минификация JS с помощью terser.
            // Используется по умолчанию.
            new TerserWebpackPlugin(),
        ];
    }

    return config;
};

const filename = (ext) => (isDev ? `[name].${ext}` : `[name].[hash].${ext}`);

const cssLoaders = (extra) => {
    const loaders = [
        {
            loader: MiniCssExtractPlugin.loader,
            options: {
                hmr: isDev,
                reloadAll: true,
            },
        },
        'css-loader',
    ];

    if (extra) {
        loaders.push(extra);
    }

    return loaders;
};

const babelOptions = (preset) => {
    const opts = {
        // Preset - набор плагинов.
        // Позволяет использовать последнюю версию JS без необходимости микроуправления тем,
        // какие преобразования синтаксиса (и, возможно, полифилы браузера) необходимы целевой среде.
        presets: ['@babel/preset-env'],
        // Позволяет использовать статические свойства классов.
        plugins: ['@babel/plugin-proposal-class-properties'],
    };

    if (preset) {
        opts.presets.push(preset);
    }

    return opts;
};

const jsLoaders = () => {
    const loaders = [
        {
            // Транспиляция JS-кода.
            loader: 'babel-loader',
            options: babelOptions(),
        },
    ];

    if (isDev) {
        // DEPRECATED
        // Use eslint-webpack-plugin
        loaders.push('eslint-loader');
    }

    return loaders;
};

const plugins = () => {
    const base = [
        new HTMLWebpackPlugin({
            template: './index.html',
            minify: {
                collapseWhitespace: isProd,
            },
        }),
        new CleanWebpackPlugin(),
        new CopyWebpackPlugin([
            {
                from: path.resolve(__dirname, 'src/favicon.ico'),
                to: path.resolve(__dirname, 'dist'),
            },
        ]),
        // Извлекает CSS в отдельный файл.
        // Создает CSS-файл для каждого JS-файла, содержащего CSS.
        // Поддерживает on-demand-loading CSS и исходные карты.
        new MiniCssExtractPlugin({
            filename: filename('css'),
        }),
    ];

    if (isProd) {
        // Визуализация размера выходных файлов webpack с помощью интерактивной масштабируемой древовидной карты.
        base.push(new BundleAnalyzerPlugin());
    }

    return base;
};

module.exports = {
    // Путь до директории с входными файлами.
    context: path.resolve(__dirname, 'src'),
    // Режим (production по-умолчанию), сборка работает быстрее, так как оптимизации не выполняются.
    mode: 'development',
    // Входные точки. Файлы, с которых webpack начинает процесс сборки.
    entry: {
        // @babel/polyfill для работы с такими сущностями JS, как Promise или WeakMap.
        // Эмулирует среду ES6+.
        main: ['@babel/polyfill', './index.jsx'],
        analytics: './analytics.ts',
    },
    output: {
        // Определяет имя выходного bundle'а.
        filename: filename('js'),
        // Директория с результатом сборки (bundles, assets и все, что загружено webpack'ом).
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        // Если в импорте не указано расширение файла, webpack попытается разрешить эти расширения по порядку.
        // Если несколько файлов имеют одинаковое имя, но разные расширения, webpack использует расширение, указанным первым.
        extensions: ['.js', '.json', '.png'],
        // Псевдонимы часто используемый папок для упрощения импортов.
        alias: {
            '@models': path.resolve(__dirname, 'src/models'),
            '@': path.resolve(__dirname, 'src'),
        },
    },
    optimization: optimization(),
    // Набор параметров для webpack-dev-server.
    devServer: {
        port: 4200,
        // Browser Hot Reload
        hot: isDev,
    },
    // Генерация исходных карт.
    // source-map: slowest, original source.
    devtool: isDev ? 'source-map' : '',
    plugins: plugins(),
    module: {
        rules: [
            {
                test: /\.css$/,
                use: cssLoaders(),
            },
            {
                test: /\.less$/,
                use: cssLoaders('less-loader'),
            },
            {
                test: /\.s[ac]ss$/,
                use: cssLoaders('sass-loader'),
            },
            {
                test: /\.(png|jpg|svg|gif)$/,
                use: ['file-loader'],
            },
            {
                test: /\.(ttf|woff|woff2|eot)$/,
                use: ['file-loader'],
            },
            {
                test: /\.xml$/,
                use: ['xml-loader'],
            },
            {
                test: /\.csv$/,
                use: ['csv-loader'],
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: jsLoaders(),
            },
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                loader: {
                    loader: 'babel-loader',
                    options: babelOptions('@babel/preset-typescript'),
                },
            },
            {
                test: /\.jsx$/,
                exclude: /node_modules/,
                loader: {
                    loader: 'babel-loader',
                    options: babelOptions('@babel/preset-react'),
                },
            },
        ],
    },
};
