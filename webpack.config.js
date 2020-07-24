const path = require("path");
module.exports = {
  mode: process.env.NODE_ENV === "production" ? "production" : "development",
  entry: {
    main: "./assets/js/main.js",
    // add
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env" /*, "@babel/preset-react" */],
          },
        },
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, "public/assets/js"),
    filename: "[name].js",
  },
  optimization: {
    // 参考　：　https://qiita.com/soarflat/items/1b5aa7163c087a91877d
    splitChunks: {
      chunks: "all",
      name: "vendor",
    },
  },
};
