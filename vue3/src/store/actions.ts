// 动态路由并不是直接全部加载的，而是通过 src/store/actions.ts 中的 userRouter 列表进行过滤。
import { CHANGEROUTE } from './mutation-types'
import { asyncRoutes, constantRoutes } from '@/router'
import { recursionRouter, setSingleItem } from '@/utils/recursion-router'
// import { getRoleList } from '@/api' // 屏蔽掉这个接口导入

export default {
  // 改变路由
  async changeAsyncRoute ({ commit }: any) {
    // --- 修改开始：不再请求后端，直接构造本地数据 ---
    // 这里的数组包含了你想要显示的菜单名称（对应 src/router/index.ts 中的 name 字段）
    const userRouter: string[] = [
      'Index', 'Demo', 'Table', 'Icon', 'Error', 'Error403', 'Error404', 
      'echart', 'Bar', 'Line', 'Pie', 'product-manage', 'product-list', 
      'review-manage', 'order-manage', 'order-list', 'return-goods', 
      'goods', 'goods-list', 'goods-classify', 'permission', 
      'user-manage', 'role-manage', 'menu-manage','data-source',   // 父级菜单
      'video-manage','algorithm-manage','algorithm-list',  // 子级页面
    ]
    
    // 模拟接口成功的逻辑
    const data = recursionRouter(userRouter, asyncRoutes)
    const menu = [...constantRoutes, ...data]

    const allRouterList = menu.filter(
      (item: { hidden: any }) => !item.hidden
    )
    
    // 设置侧边栏菜单
    const currentMenu = setSingleItem(allRouterList, [])
    commit(CHANGEROUTE, currentMenu)
    
    return data // 返回过滤后的路由供添加
    // --- 修改结束 ---
  }
}