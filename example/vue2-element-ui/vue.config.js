const { externalsData, getExternalModules } = require('./src/externalCdn/index.js')
const path = require('path')

const { defineConfig } = require('@vue/cli-service')

// 代码压缩
const TerserPlugin = require("terser-webpack-plugin") // 代替uglifyjs-webpack-plugin 因为uglifyjs不支持es6语法
const CompressionWebpackPlugin = require('compression-webpack-plugin')

// 代码分析
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin

const isProduction = process.env.NODE_ENV === 'production'

const { title, publicPath } = require('./src/settings')

function resolve (dir) {
  return path.join(__dirname, './', dir)
}

module.exports = defineConfig({
  transpileDependencies: [],
  publicPath: publicPath,
  outputDir: 'dist',
  assetsDir: 'static',
  pages: {
    index: {
      // page 的入口
      entry: 'src/main.js',
      // 模板来源
      template: 'public/index.html',
      // 当使用 title 选项时，
      // template 中的 title 标签需要是 <title><%= htmlWebpackPlugin.options.title %></title>
      title: title,
      externalsData: externalsData
    }
  },
  lintOnSave: false,
  productionSourceMap: !isProduction,
  configureWebpack: config => {
    config.externals = {
      ...config.externals,
      ...getExternalModules()
    }
    const defaultPlugins = []
    config.plugins = [...config.plugins, ...defaultPlugins]
    if (isProduction) {
      // 为生产环境修改配置...
      const plugins = []
      plugins.push(
        new CompressionWebpackPlugin({
          test: /\.js$|\.html$|.\css/, // 匹配文件名
          threshold: 10240, // 对超过10k的数据压缩
          deleteOriginalAssets: false // 不删除源文件
        })
      )
      config.plugins = [...config.plugins, ...plugins]
    } else {
      // 为开发环境修改配置...
    }
    if (process.env.VUE_APP_DEBUG === 'no') {
      const debugPlugins = []
      debugPlugins.push(
        new TerserPlugin({ // 移除console.log
          exclude: /\/staic-excludes/, // 忽略 staic-excludes 文件夹
          terserOptions: {
            ecma: undefined,
            parse: {},
            compress: {
              drop_console: true
            }
          }
        })
      )
      config.plugins = [...config.plugins, ...debugPlugins]
    }
  },
  chainWebpack: config => {
    // 打包分析
    if (process.env.IS_ANALYZ) {
      config.plugin('webpack-report').use(BundleAnalyzerPlugin, [{
        analyzerMode: 'static'
      }])
    }
    config.resolve.alias.set('@', resolve('src'))
  },
  css: {
    // css预设器配置项
    loaderOptions: {
      // 给 sass-loader 传递选项
      sass: {
        // 引入全局变量样式
        // @/ 是 src/ 的别名
        // 注意：在 sass-loader v8 中，这个选项名是 "prependData"
        additionalData: `@import "~@/styles/variables.scss"`,
        // https://toscode.gitee.com/y_project/RuoYi-Vue/issues/I4MXMK
        // https://blog.csdn.net/YZi_Angel/article/details/122305569
        sassOptions: {
          outputStyle: 'expanded'
        }
      },
      // 默认情况下 `sass` 选项会同时对 `sass` 和 `scss` 语法同时生效
      // 因为 `scss` 语法在内部也是由 sass-loader 处理的
      // 但是在配置 `prependData` 选项的时候
      // `scss` 语法会要求语句结尾必须有分号，`sass` 则要求必须没有分号
      // 在这种情况下，我们可以使用 `scss` 选项，对 `scss` 语法进行单独配置
      scss: {
        // 引入全局变量样式
        additionalData: `@import "~@/styles/variables.scss";`
      }
    }
  }
})
