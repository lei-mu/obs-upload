import Vue from 'vue'
import VueRouter from 'vue-router'
import routesList from './routes/settings'
import {title, titleSeparator} from '@/settings'

Vue.use(VueRouter)
const createRouter = () => new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: routesList,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return {
        x: 0,
        y: 0
      }
    }
  }
})

const router = createRouter()

console.log(router)

// Detail see: https://github.com/vuejs/vue-router/issues/1234#issuecomment-357941465
export function resetRouter() {
  const newRouter = createRouter()
  router.matcher = newRouter.matcher // reset router
}

// 首次进入
let firstEnter = true
/* 路由跳转前 */
router.beforeEach(async (to, from, next) => {
  console.log('----router baforeEach___to')
  console.log(to)
  let toMeta = to.meta || {}
  const toQuery = to.query
  console.log('----router baforeEach___to - toMeta')
  console.log(toMeta)

  next()
  let preTitle = title
  if (toMeta.pageTitle) {
    preTitle = `${toMeta.pageTitle}${titleSeparator}${title}`
  }
  document.title = preTitle
})
export default router
