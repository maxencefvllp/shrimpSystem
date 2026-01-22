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
        <a-card hoverable class="video-card">
          <template #cover>
            <div class="video-placeholder">
              <icon-font type="icon-video" style="font-size: 40px; color: #1890ff" />
            </div>
          </template>
          
          <a-card-meta :title="item.name">
            <template #description>
              <div class="video-info">
                <span>大小: {{ item.size }}</span>
                <a-button type="link" danger size="small" @click="removeVideo(item.id)">
                  删除
                </a-button>
              </div>
            </template>
          </a-card-meta>
        </a-card>
      </a-col>
    </a-row>
    
    <a-empty v-if="videoList.length === 0" description="暂无视频数据" />
  </a-card>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { message } from 'ant-design-vue'

export default defineComponent({
  setup() {
    // 模拟存储上传后的视频列表
    const videoList = ref<any[]>([])

    const handleUploadChange = (info: any) => {
      const { status } = info.file
      
      // 在实际开发中，这里应处理 status === 'done'
      // 为了演示，我们捕获上传尝试并模拟卡片生成
      if (status === 'uploading') {
        return;
      }

      // 模拟上传成功并保存到本地状态中
      message.success(`${info.file.name} 已添加到视频库`)
      videoList.value.push({
        id: Date.now(),
        name: info.file.name,
        size: info.file.size ? (info.file.size / 1024 / 1024).toFixed(2) + ' MB' : '未知大小'
      })
    }

    const removeVideo = (id: number) => {
      videoList.value = videoList.value.filter(v => v.id !== id)
      message.success('视频已移除')
    }

    return {
      videoList,
      handleUploadChange,
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
}

.video-placeholder {
  height: 120px;
  background: #f0f2f5;
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
}
</style>