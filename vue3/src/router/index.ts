import { createRouter, createWebHashHistory } from 'vue-router'
import Layout from '@/views/layout/index.vue'
import EmptyLayout from '@/views/empty_layout/index.vue'
export const constantRoutes = [
  {
    path: '/',
    component: Layout,
    redirect: '/index',
    name: 'Index',
    meta: {
      title: '首页',
      icon: 'icon-comments',
      single: true
    },
    children: [
      {
        path: '/index',
        name: 'Index',
        component: () => import('@/views/index/index.vue'),
        meta: {
          title: '首页',
          icon: 'icon-youxiang'
        }
      }
    ]
  },
  // {
  //   path: '/demo',
  //   component: Layout,
  //   name: 'Demo',
  //   redirect: '/demo/table',
  //   meta: {
  //     title: '组件',
  //     icon: 'icon-product'
  //   },
  //   children: [
  //     {
  //       path: '/demo/table',
  //       name: 'Table',
  //       component: () => import('@/views/demo/table/index.vue'),
  //       meta: {
  //         title: '表格',
  //         icon: 'icon-packing-labeling'
  //       }
  //     },
  //     {
  //       path: '/demo/icon',
  //       name: 'Icon',
  //       component: () => import('@/views/demo/icon/index.vue'),
  //       meta: {
  //         title: '图标',
  //         icon: 'icon-trade-assurance'
  //       }
  //     }
  //   ]
  // },

  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/Login.vue'),
    hidden: true
  },
  {
    path: '/:pathMatch(.*)*',
    name: '404',
    component: () => import('@/views/error/404.vue'),
    hidden: true
  }
]

export const asyncRoutes = [

  {
    path: '/data-source',
    component: Layout,
    name: 'data-source',
    redirect: '/data-source/video',
    meta: {
      title: '数据源',
      icon: 'icon-product' // 使用项目已有的图标
    },
    children: [
      {
        path: '/data-source/video',
        name: 'video-manage',
        component: () => import('@/views/data_source/video/dataSource.vue'),
        meta: {
          title: '视频管理',
          icon: 'icon-video'
        }
      }
    ]
  },
  {
    path: '/algorithm',
    component: Layout,
    name: 'algorithm-manage',
    meta: { title: '算法库管理', icon: 'icon-product' }, // 确保图标名存在
    children: [
      {
        path: 'list',
        name: 'algorithm-list',
        component: () => import('@/views/algorithm/algorithmManage.vue'),
        meta: { title: '算法列表' }
      }
    ]
  },
  {
    path: '/permission',
    component: Layout,
    name: 'permission',
    redirect: '/permission/user',
    meta: {
      title: '用户管理',
      icon: 'icon-cecurity-protection'
    },
    children: [
      {
        path: '/permission/user',
        name: 'user-manage',
        component: () => import('@/views/permission/user_manage/index.vue'),
        meta: {
          title: '用户管理',
          icon: 'icon-confirm'
        }
      },
      {
        path: '/permission/role',
        name: 'role-manage',
        component: () => import('@/views/permission/role_manage/index.vue'),
        meta: {
          title: '角色管理',
          icon: 'icon-Customermanagement'
        }
      },
      {
        path: '/permission/menu',
        name: 'menu-manage',
        component: () => import('@/views/permission/menu_manage/index.vue'),
        meta: {
          title: '菜单管理',
          icon: 'icon-earth'
        }
      }
    ]
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes
})

export default router
