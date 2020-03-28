const path = require("path");

var HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  resolve: {
    modules: [
      "node_modules",
      path.resolve(__dirname, "src"),
      path.resolve(__dirname, "assets"),
    ],
    extensions: [".ts", ".js", ".json", ".css", ".glsl"],
  },

  entry: {
    app: "./src/game.ts",
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: "Ayyteegee",
      filename: "index.html",
      template: "src/index.ejs",
      hash: true,
    }),
  ],

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },

  devtool: "source-map",

  module: {
    rules: [
      {
        test: /\.ts$/,
        include: [path.resolve(__dirname, "src")],
        loader: "ts-loader",
      },
    ],
  },
};
