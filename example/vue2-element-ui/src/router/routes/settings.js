
export default [
  // {
  //   path: '/',
  //   redirect: '/layout'
  // },
  {
    path: '/',
    component: () => import('@/views/layout/main.vue'),
    children: [
      {
        path: '/fixed-secret',
        name: 'fixedSecret',
        component: () => import('@/views/fixed-secret'),
        meta: {
          pageTitle: '固定ak,sk'
        }
      },
      {
        path: '/async-secret',
        name: 'asyncSecret',
        component: () => import('@/views/async-secret'),
        meta: {
          pageTitle: '异步获取ak,sk'
        }
      },
      {
        path: '/custom-upload',
        name: 'customUpload',
        component: () => import('@/views/custom-upload'),
        meta: {
          pageTitle: '自定义上传'
        }
      }
    ],
    redirect: '/fixed-secret'
  }
]
