<template>
  <a-card title="视频管理">
    <div class="upload-area">
      <a-upload-dragger
        name="file"
        :multiple="false"
        :show-upload-list="false"
        action="/api/upload/video"
        @change="handleUploadChange"
      >
        <p class="ant-upload-drag-icon">
          <icon-font type="icon-video" style="font-size: 48px" />
        </p>
        <p class="ant-upload-text">点击或将视频文件拖拽到此区域上传</p>
        <p class="ant-upload-hint">支持 mp4, avi, mov 等格式</p>
      </a-upload-dragger>
    </div>

    <a-divider>视频库</a-divider>

    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in videoList" :key="item.id">
        <a-card hoverable class="video-card" @click="handlePreview(item)">
          <template #cover>
            <div class="video-placeholder">
              <icon-font type="icon-video" style="font-size: 40px; color: #1890ff" />
              <div class="play-mask">
                <icon-font type="icon-play-circle" style="font-size: 32px; color: #fff" />
              </div>
            </div>
          </template>
          
          <a-card-meta :title="item.name">
            <template #description>
              <div class="video-info">
                <span>大小: {{ item.size }}</span>
                <a-button type="link" danger size="small" @click.stop="removeVideo(item.id)">
                  删除
                </a-button>
              </div>
            </template>
          </a-card-meta>
        </a-card>
      </a-col>
    </a-row>
    
    <a-empty v-if="videoList.length === 0" description="暂无视频数据" />

    <a-modal
      v-model:visible="previewVisible"
      :title="previewTitle"
      :footer="null"
      width="800px"
      destroyOnClose
    >
      <video
        v-if="previewUrl"
        :src="previewUrl"
        controls
        autoplay
        style="width: 100%; border-radius: 4px;"
      >
        您的浏览器不支持视频播放。
      </video>
    </a-modal>
  </a-card>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { message } from 'ant-design-vue'
import axios from 'axios'
import { onMounted } from 'vue'
import { getVideoList, deleteVideo } from '@/api' // 引入统一定义的接口
export default defineComponent({
  setup() {
    const videoList = ref<any[]>([])

    // 页面加载时拉取数据库中的视频
  const fetchVideos = async () => {
    try {
      // 假设已在配置中处理了 /api 代理
      const res = await getVideoList()
      if (res.data.code === 1) {
        videoList.value = res.data.data
      }
    } catch (error) {
      console.error('获取视频失败', error)
    }
  }
    
    // 预览相关的状态
    const previewVisible = ref(false)
    const previewUrl = ref('')
    const previewTitle = ref('')

    const handleUploadChange = (info: any) => {
      if (info.file.status === 'done') {
      const serverData = info.file.response.data
      videoList.value.unshift(serverData) // 将后端返回的带 ID 的数据存入列表
      message.success('视频已保存至数据库')
    }
    }
    const removeVideo = async (id: number) => {
      try {
        const res = await deleteVideo(id)
        if (res.code === 1) {
          videoList.value = videoList.value.filter(v => v.id !== id)
          message.success('删除成功')
        }
      } catch (error) {
        message.error('删除操作失败')
      }
    }

    // 处理预览点击
    const handlePreview = (item: any) => {
      if (!item.url) {
        return message.warning('该视频暂不可预览')
      }
      previewUrl.value = item.url
      previewTitle.value = item.name
      previewVisible.value = true
    }

    onMounted(() => {
    fetchVideos()
  })

    return {
      videoList,
      previewVisible,
      previewUrl,
      previewTitle,
      handleUploadChange,
      handlePreview,
      removeVideo
    }
  }
})
</script>

<style scoped>
.upload-area {
  padding: 20px;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  margin-bottom: 24px;
}

.video-card {
  overflow: hidden;
  border-radius: 8px;
  position: relative;
}

.video-placeholder {
  height: 140px;
  background: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

/* 播放遮罩效果 */
.play-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.video-card:hover .play-mask {
  opacity: 1;
}

.video-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
}
</style>