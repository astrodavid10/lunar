const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  publicPath: "./",

  // Don't ship source maps to visitors (audit E4).
  productionSourceMap: false,

  devServer: {
    client: {
      overlay: false,
    },
  },
});
