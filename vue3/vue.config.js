const proxyTargetMap = {
  prod: 'http://47.105.71.81:3306',   // 生产环境（云服务器）
  randy: 'http://47.105.71.81:3306',  // 开发者 Randy 的测试环境
  peter: 'http://192.168.11.178:3001' // 开发者 Peter 的局域网环境
}
// process.env.API_TYPE：这是系统环境变量。比如你在启动前端时设置了 API_TYPE=peter，那么 proxyTarget 就会变成 Peter 的那个 IP。
// || proxyTargetMap.prod：如果你没有设置任何环境变量，它会默认使用 prod（生产环境）的地址。
let proxyTarget = proxyTargetMap[process.env.API_TYPE] || proxyTargetMap.prod
module.exports = {
  publicPath: './',//设置打包后的资源路径为相对路径
  devServer: {
    open: true,
    // 当前端发起任何以 /api 开头的请求时（如 axios.get('/api/videos')），代理服务器就会接管这个请求。
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 改为本地后端地址 这意味着无论你怎么切换环境，它目前都会去找你本地运行的 Node.js 后端。
        changeOrigin: true, //它会告诉后端服务器：“我是从 localhost:3000 发出的”，从而绕过浏览器的同源策略（CORS）限制。
        pathRewrite: {
          // 脱掉“马甲”。这个配置会把开头的 /api 删掉，再传给后端。
          '^/api': '' // 这样请求 /api/user/login 会变为 http://localhost:3000/user/login
        }
      }
    }
  }
}


// 在“视频管理”页面点击了上传：

// 前端发起：axios.post('/api/upload/video')。

// 代理拦截：Vue 的开发服务器发现请求开头是 /api。

// 地址转换：根据 target 配置，它把请求地址补全为 http://localhost:3000/api/upload/video。

// 路径抹除：根据 pathRewrite，它把地址精简为 http://localhost:3000/upload/video。

// 后端接收：你的 index.ts 收到请求，Multer 开始处理视频流，转码并存入 SQLite 数据库。