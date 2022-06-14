/**
 * 异常页面、404
 * */

// 404 页面
export const notFoundRoute = {
  path: '*',
  name: 'notFound',
  component: () => import('@/views/abnormal/not-found.vue'),
  meta: {
    noAuth: true,
    pageTitle: '页面不存在'
  }
}

export default []
