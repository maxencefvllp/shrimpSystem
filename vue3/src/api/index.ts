import request from '@/utils/axios'
import { AxiosRequestConfig }from 'axios'

export const getRoleList = () => {
    const obj:AxiosRequestConfig = {
        url:'/user/info',
        method:'get'
    }
  return request(obj)
}

export const doLogin = (data:any) => {
    const obj:AxiosRequestConfig = {
        url:'/user/login',
        method:'post',
        data
    }
  return request(obj)
}
// 获取视频列表
export const getVideoList = () => {
  return request({
    url: '/videos', // 注意：这里不需要加 /api，因为 axios.ts 里的 baseURL 会自动补上
    method: 'get'
  })
}

// 上传视频逻辑通常由 a-upload 组件处理，但如果你需要手动调用：
export const uploadVideoApi = (data: any) => {
  return request({
    url: '/upload/video',
    method: 'post',
    data
  })
}

// 删除视频
export const deleteVideo = (id: number) => {
  return request({
    url: `/videos/${id}`,
    method: 'delete'
  })
}
export const addStreamVideo = (data:{name:string,url:string})=> {
  return request({
    url: `/video/stream`,
    method: 'post',
    data
  })
}
export const clipVideoApi = (data: { 
  sourceUrl: string, 
  startTime: number, 
  endTime: number, 
  name: string 
}) => {
  return request({
    url: '/video/clip',
    method: 'post',
    data
  })
}
// src/api/index.ts
// 1. 获取算法列表
export const getAlgorithmList = () => {
  return request({
    url: '/algorithm', // 后端虽然写了 /api/algorithms，但代理通常会去掉 /api
    method: 'get'
  })
}

// 2. 删除算法
export const deleteAlgorithm = (id: number) => {
  return request({
    url: `/algorithm/${id}`,
    method: 'delete'
  })
}

export const exportStreamVideo = (data: { url: string, name: string }) => {
    return request({
        url: '/video/export',
        method: 'post',
        data
    })
}