/**
 * @property {String} label - 标签名称
 * @property {String} label - js 插件的包名称
 * @property {String} scope - js 插件的暴露给window的名称
 * @property {String} props - 标签属性
 * @property {String} content - 标签内部内容
 * */


const isProduction = process.env.NODE_ENV === 'production'
const externalsData = [
  {
    label: 'script',
    name: 'axios',
    scope: 'axios',
    props: { src: 'https://cdn.bootcdn.net/ajax/libs/axios/0.27.2/axios.min.js' },
    content: ''
  },
  {
    label: 'script',
    name: 'vue',
    scope: 'Vue',
    props: { src: isProduction ? 'https://cdn.bootcdn.net/ajax/libs/vue/2.6.14/vue.runtime.min.js' : 'https://cdn.bootcdn.net/ajax/libs/vue/2.6.14/vue.runtime.js' },
    content: ''
  },
  {
    label: 'script',
    name: 'vue-router',
    scope: 'VueRouter',
    props: { src: 'https://cdn.bootcdn.net/ajax/libs/vue-router/3.5.3/vue-router.min.js' },
    content: ''
  },
  {
    label: 'script',
    name: 'vuex',
    scope: 'Vuex',
    props: { src: isProduction ? 'https://cdn.bootcdn.net/ajax/libs/vuex/3.6.2/vuex.min.js' : 'https://cdn.bootcdn.net/ajax/libs/vuex/3.6.2/vuex.js' },
    content: ''
  },
  {
    label: "script",
    name: "element-ui",
    scope: "ELEMENT",
    props: { src: "https://cdn.bootcdn.net/ajax/libs/element-ui/2.15.8/index.min.js" },
    content: ""
  },
  {
    label: 'link',
    name: '',
    scope: '',
    props: { href: 'https://cdn.bootcdn.net/ajax/libs/element-ui/2.15.8/theme-chalk/index.min.css' },
    content: ''
  },
]
module.exports.externalsData = externalsData
// 其他的external
const otherExternalsData = {}

// 获取configureWebpack -> config.externals 配置
exports.getExternalModules = () => {
  const externals = {} // 结果
  externalsData.forEach(item => {
    // 遍历配置
    if (item.name && item.scope) {
      externals[item.name] = item.scope
    }
  })
  return { ...externals, ...otherExternalsData }
}
