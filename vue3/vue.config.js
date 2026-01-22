
const proxyTargetMap = {
  prod: 'http://47.105.71.81:3306',
  randy: 'http://47.105.71.81:3306',
  peter: 'http://192.168.11.178:3001'
}
let proxyTarget = proxyTargetMap[process.env.API_TYPE] || proxyTargetMap.prod
module.exports = {
  publicPath: './',
  devServer: {
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 改为本地后端地址
        changeOrigin: true,
        pathRewrite: {
          '^/api': '' // 这样请求 /api/user/login 会变为 http://localhost:3000/user/login
        }
      }
    }
  }
}