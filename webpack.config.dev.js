const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
/**
 * Using this https://github.com/SimplifyJobs/webpack-ext-reloader/
 * instead of webpack-extension-reloader, to support webpack 5.
 */
const ExtensionReloader = require("webpack-ext-reloader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const WextManifestWebpackPlugin = require("wext-manifest-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

const viewsPath = path.join(__dirname, "views");
const sourcePath = path.join(__dirname, "src");
const destPath = path.join(__dirname, "extension");
const nodeEnv = process.env.NODE_ENV || "development";
const targetBrowser = process.env.TARGET_BROWSER;

const extensionReloaderPlugin = new ExtensionReloader({
  port: 9090,
  reloadPage: true,
  entries: {
    contentScript: [
      "action-scripts/save-new-drawing",
      "action-scripts/update-current-drawing",
      "action-scripts/switch-drawing",
      "action-scripts/new-empty-drawing",
      "action-scripts/send-stored-files",
      "action-scripts/add-files-to-store",
      "action-scripts/delete-unused-files-from-store",
      "content-scripts/listenDrawingUpdates",
      "content-scripts/addOverwriteAction",
    ],
    background: "background",
    extensionPage: [
      "popup",
      "options",
      "action-scripts/save-new-drawing",
      "content-scripts/listenDrawingUpdates",
      "content-scripts/addOverwriteAction",
    ],
  },
});

module.exports = {
  devtool: false, // https://github.com/webpack/webpack/issues/1194#issuecomment-560382342

  stats: {
    all: false,
    builtAt: true,
    errors: true,
    hash: true,
  },

  mode: nodeEnv,

  entry: {
    manifest: path.join(sourcePath, "manifest.json"),
    background: path.join(sourcePath, "background", "index.ts"),
    "action-scripts/save-new-drawing": path.join(
      sourcePath,
      "action-scripts",
      "save-new-drawing.ts"
    ),
    "action-scripts/update-current-drawing": path.join(
      sourcePath,
      "action-scripts",
      "update-current-drawing.ts"
    ),
    "action-scripts/switch-drawing": path.join(
      sourcePath,
      "action-scripts",
      "switch-drawing.ts"
    ),
    "action-scripts/new-empty-drawing": path.join(
      sourcePath,
      "action-scripts",
      "new-empty-drawing.ts"
    ),
    "action-scripts/send-stored-files": path.join(
      sourcePath,
      "action-scripts",
      "send-stored-files.ts"
    ),
    "action-scripts/delete-unused-files-from-store": path.join(
      sourcePath,
      "action-scripts",
      "delete-unused-files-from-store.ts"
    ),
    "action-scripts/add-files-to-store": path.join(
      sourcePath,
      "action-scripts",
      "add-files-to-store.ts"
    ),
    "content-scripts/listenDrawingUpdates": path.join(
      sourcePath,
      "ContentScript",
      "listenDrawingUpdates.ts"
    ),
    "content-scripts/addOverwriteAction": path.join(
      sourcePath,
      "ContentScript",
      "addOverwriteAction.ts"
    ),
    popup: path.join(sourcePath, "Popup", "index.tsx"),
    options: path.join(sourcePath, "Options", "index.tsx"),
  },

  output: {
    path: path.join(destPath, targetBrowser),
    filename: "js/[name].bundle.js",
  },

  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
    alias: {
      "webextension-polyfill-ts": path.resolve(
        path.join(__dirname, "node_modules", "webextension-polyfill-ts")
      ),
      "react/jsx-dev-runtime": "react/jsx-dev-runtime.js",
      "react/jsx-runtime": "react/jsx-runtime.js"
    },
  },

  module: {
    rules: [
      // The chrome_style option cannot be used with manifest version 3.

      {
        type: "javascript/auto", // prevent webpack handling json with its own loaders,
        test: /manifest\.json$/,
        use: {
          loader: "wext-manifest-loader",
          options: {
            usePackageJSONVersion: true, // set to false to not use package.json version for manifest
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.(js|ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.(sa|sc|c)ss$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader, // It creates a CSS file per JS file which contains CSS
          },
          {
            loader: "css-loader", // Takes the CSS files and returns the CSS with imports and url(...) for Webpack
            options: {
              sourceMap: true,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  [
                    "autoprefixer",
                    {
                      // Options
                    },
                  ],
                ],
              },
            },
          },
          "resolve-url-loader", // Rewrites relative paths in url() statements
          {
            loader: "sass-loader", // Takes the Sass/SCSS file and compiles to the CSS
          },
        ],
      },
    ],
  },

  plugins: [
    // Plugin to not generate js bundle for manifest entry
    new WextManifestWebpackPlugin(),
    // Generate sourcemaps
    new webpack.SourceMapDevToolPlugin({ filename: false }),
    new ForkTsCheckerWebpackPlugin(),
    // environmental variables
    new webpack.EnvironmentPlugin(["NODE_ENV", "TARGET_BROWSER"]),
    // delete previous build files
    new CleanWebpackPlugin({
      cleanOnceBeforeBuildPatterns: [
        path.join(process.cwd(), `extension/${targetBrowser}`),
      ],
      cleanStaleWebpackAssets: false,
      verbose: true,
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "popup.html"),
      inject: "body",
      chunks: ["popup"],
      hash: true,
      filename: "popup.html",
    }),
    new HtmlWebpackPlugin({
      template: path.join(viewsPath, "options.html"),
      inject: "body",
      chunks: ["options"],
      hash: true,
      filename: "options.html",
    }),
    // write css file(s) to build folder
    new MiniCssExtractPlugin({ filename: "css/[name].css" }),
    // copy static assets and external libs
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/assets", to: "assets" },
        { from: "src/external-libs", to: "libs" },
        { from: "node_modules/react/umd/react.production.min.js", to: "libs" },
        {
          from: "node_modules/react-dom/umd/react-dom.production.min.js",
          to: "libs",
        },
        {
          from: "node_modules/react-dom/umd/react-dom.production.min.js",
          to: "libs",
        },
        {
          from: "node_modules/@excalidraw/excalidraw/dist/excalidraw-assets/",
          globOptions: {
            dot: true,
            // The built lib external-libs/exccalidraw.production.js is one single file, no need to copy chunks.
            ignore: ["**/vendor-*.js*", "**/locales/**"],
          },
          to: "assets/excalidraw-assets",
          toType: "dir",
        },
      ],
    }),
    // plugin to enable browser reloading in development mode
    extensionReloaderPlugin,
  ],
  optimization: {
    minimize: false,
  },
};
