const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: {
    main: './src/index.js',
    pdf: './src/pdf.js',
    documentation: './src/documentation.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devtool: 'inline-source-map',
  devServer: {
    static: [
      {
        directory: path.join(__dirname, '/'),
        publicPath: '/'
      },
      {
        directory: path.join(__dirname, 'dist'),
        publicPath: '/'
      }
    ],
    hot: true,
    port: 8080,
    open: true,
    historyApiFallback: true
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.rdlc$/,
        type: 'asset/source',
      },
      {
        test: /\.xml$/,
        type: 'asset/source',
      }, {
        test: /\.md$/,
        type: 'asset/source',
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'AIReader',
      template: 'index.html',
      filename: 'index.html',
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      title: 'PDF Grid Extractor',
      template: 'pdf.html',
      filename: 'pdf.html',
      chunks: ['pdf']
    }),
    new HtmlWebpackPlugin({
      title: 'Documentation',
      template: 'documentation.html',
      filename: 'documentation.html',
      chunks: ['documentation']
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'documentation.md', to: 'dist' }
      ]
    })
  ],
};