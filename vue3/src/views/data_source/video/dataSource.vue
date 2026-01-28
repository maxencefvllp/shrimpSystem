<template>
  <a-card title="视频管理">
    <!-- 插槽（Slot）技术。将内容放置在卡片右上角的额外区域。 -->
    <!-- action 是后端接收文件的接口地址。当点击按钮选择文件后，浏览器会自动向该地址发起 POST 请求。 -->
    <template #extra> 
      <a-button type="primary" @click="addModalVisible = true">
        <template #icon><icon-font type="icon-plus" /></template>
        添加视频资源
      </a-button>
    </template>
    
    <!-- 栅格布局。:gutter 设置了视频卡片之间的间距（水平和垂直各 16 像素）。 -->
    <a-row :gutter="[16, 16]">
      <!-- 动态渲染。遍历 videoList 数组，为数据库中的每个视频生成一个 <a-col> 列。 -->
      <a-col :xs="24" :sm="12" :md="8" :lg="6" v-for="item in videoList" :key="item.id">
        <!-- 点击整个卡片会触发预览函数，传入当前视频的对象数据。 -->
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
          <a-modal
          v-model:visible="addModalVisible"
          title="添加视频资源"
          :footer="null"
          destroyOnClose
        >
          <a-tabs v-model:activeKey="activeTab">
            <a-tab-pane key="local" tab="本地视频">
              <div style="padding: 20px 0">
                <a-upload-dragger
                  name="file"
                  :multiple="false"
                  action="/api/upload/video"
                  @change="handleUploadChange"
                >
                  <p class="ant-upload-drag-icon"><icon-font type="icon-upload" /></p>
                  <p class="ant-upload-text">点击或拖拽本地视频文件上传</p>
                </a-upload-dragger>
              </div>
            </a-tab-pane>

            <a-tab-pane key="stream" tab="流式/摄像头">
              <a-form layout="vertical">
                <a-form-item label="名称" required>
                  <a-input v-model:value="streamForm.name" placeholder="如：3号对虾养殖池" />
                </a-form-item>
                <a-form-item label="RTSP/HLS 地址" required>
                  <a-input v-model:value="streamForm.url" placeholder="rtsp://admin:123456@192.168.1.10..." />
                </a-form-item>
                <a-alert message="提示：RTSP 流将自动开启 1 小时循环录制" type="info" show-icon style="margin-bottom: 15px" />
                <a-button type="primary" block @click="submitStream">确认接入</a-button>
              </a-form>
            </a-tab-pane>
          </a-tabs>
        </a-modal>


        </a-card>
      </a-col>
    </a-row>
    
    <a-empty v-if="videoList.length === 0" description="暂无视频数据" />
    <!-- 弹窗容器。用于播放视频。destroyOnClose 属性非常重要，它确保关闭弹窗时视频会停止播放。 -->
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
import { defineComponent, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getVideoList, deleteVideo,addStreamVideo } from '@/api'
import axios from 'axios';

export default defineComponent({
  setup() {
    const videoList = ref<any[]>([])
    const agoList = ref<any[]>([])
    const addModalVisible = ref(false) // 控制“添加”弹窗
    const activeTab = ref('local')    // 当前选中的页签
    const submitting = ref(false)     // 流地址提交状态

    const streamForm = ref({
      name: '',
      url: ''
    })

    // 修正：从数据库拉取视频的逻辑
    const fetchVideos = async () => {
      try {
        const res = await getVideoList()
        // 注意：根据项目的 axios 拦截器，res 已经是 response.data
        if (res && res.code === 1) {
          videoList.value = res.data // 直接赋值后端返回的数组
        }
      } catch (error) {
        console.error('获取视频失败', error)
      }
    }
    
    const previewVisible = ref(false)
    const previewUrl = ref('')
    const previewTitle = ref('')

    // 修改原有的 handleUploadChange，增加关闭弹窗逻辑
    const handleUploadChange = (info: any) => {
      if (info.file.status === 'done') {
        const serverData = info.file.response.data
        videoList.value.unshift(serverData)
        message.success('本地视频上传成功')
        addModalVisible.value = false // 上传完成后自动关闭弹窗
      } else if (info.file.status === 'error') {
        message.error('上传失败')
      }
    }
    // 新增：提交流地址到后端的逻辑
    const submitStream = async () => {
      if (!streamForm.value.name || !streamForm.value.url) {
        return message.warning('请填写完整的名称和地址')
      }
      
      submitting.value = true
      try {
        // 调用你在后端新写的 /api/video/stream 接口
        const res = await addStreamVideo(streamForm.value.name,streamForm.value.url)
        if (res.data.code === 1) {
          message.success('流地址已保存')
          addModalVisible.value = false // 关闭弹窗
          streamForm.value = { name: '', url: '' } // 重置表单
          fetchVideos() // 重新拉取列表以显示新数据
        }
      } catch (error) {
        message.error('保存流地址失败')
      } finally {
        submitting.value = false
      }
    }
    const removeVideo = async (id: number) => {
      try {
        const res = await deleteVideo(id)
        if (res.code === 1) {
          // 直接从当前本地数组中剔除掉那个 ID 的视频
          videoList.value = videoList.value.filter(v => v.id !== id)
          message.success('删除成功')
        }
      } catch (error) {
        message.error('删除操作失败')
      }
    }

    const handlePreview = (item: any) => {
      if (!item.url) return message.warning('该视频暂不可预览')
      previewUrl.value = item.url
      previewTitle.value = item.name
      previewVisible.value = true
    }
    // 当组件被挂载到页面上时，立即执行 fetchVideos。这就是为什么你刷新页面后，视频能自动从数据库里长出来。
    onMounted(() => {
      fetchVideos()
    })

    return {
      videoList,
      agoList,
      previewVisible,
      previewUrl,
      previewTitle,
      addModalVisible,
      streamForm,
      activeTab,
      submitting,
      handleUploadChange,
      handlePreview,
      removeVideo,
      submitStream
    }
  }
})
</script>

<style scoped>
/* 移除 upload-area 样式，因为它现在是顶部的一个按钮了 */
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