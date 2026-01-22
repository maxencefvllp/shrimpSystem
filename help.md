第一道：身份验证过滤 (Auth Filter)
在路由跳转前进行最基本的身份检查。

位置：src/permission.ts

逻辑：检查 localStorage 中是否存在 token。如果没有 token，除了白名单页面（登录、404），其他请求都会被重定向到登录页。

第二道：权限名单过滤 (Permission Whitelist Filter)
这是最关键的一步，决定了哪些“动态路由”会被真正加载到浏览器中。

位置：src/store/actions.ts 中的 changeAsyncRoute 函数

逻辑：

定义了一个硬编码的字符串数组 userRouter（即权限白名单）。

调用 recursionRouter 工具函数，将 src/router/index.ts 中定义的 asyncRoutes 与这个名单进行比对。

只有 name 属性存在于名单中的路由才会被保留。如果你在 router/index.ts 里写了算法库管理，但没在 actions.ts 的名单里加它的 name，它在这里就会被过滤掉，导致页面无法访问。

第三道：菜单显示过滤 (Menu Visibility Filter)
在确定了用户有权限访问的路由后，针对左侧边栏的显示进行最后的筛选。

位置：src/store/actions.ts

逻辑：

隐藏项筛选：通过 menu.filter 剔除掉所有标记为 hidden: true 的路由（例如登录页、404页），这些页面允许访问但不需要在菜单里占位。

单级菜单处理：调用 setSingleItem 函数，根据 meta.single 属性处理菜单层级。如果一个路由设置了 single: true（如首页），它会把子级隐藏，只显示自己作为一个一级菜单项。

路由这一块：
后端定义：D:\banBrick\shrimp\Code\shrimpSystem\vue3-admin-server\index.ts

获取列表：app.get('/algorithm', ...)

上传：app.post('/upload/algorithm', ...)

删除：app.delete('/algorithm/:id', ...)

前端定义：D:\banBrick\shrimp\Code\shrimpSystem\vue3\src\router\index.ts

获取列表：调用 /algorithm。如果你的 Axios 封装设置了 baseURL: '/api'，实际发送的是 /api/algorithm。

删除：调用 /algorithm/${id}。如果 Axios 加了前缀，发送的是 /api/algorithm/${id}。