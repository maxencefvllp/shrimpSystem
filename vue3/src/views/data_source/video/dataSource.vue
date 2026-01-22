<template>
  <a-card title="视频管理">
    <!-- 插槽（Slot）技术。将内容放置在卡片右上角的额外区域。 -->
    <!-- action 是后端接收文件的接口地址。当点击按钮选择文件后，浏览器会自动向该地址发起 POST 请求。 -->
    <template #extra> 
      <a-upload
        name="file"
        :multiple="false"
        :show-upload-list="false"
        action="/api/upload/video"
        @change="handleUploadChange"
      >
        <a-button type="primary">
          <template #icon><icon-font type="icon-video" /></template>
          添加视频
        </a-button>
      </a-upload>
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
import { getVideoList, deleteVideo } from '@/api'

export default defineComponent({
  setup() {
    const videoList = ref<any[]>([])

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

    const handleUploadChange = (info: any) => {
      // 监听上传状态。当状态为 done（完成）时，从后端的响应（response）中拿到新视频在数据库中的记录。
      // unshift(serverData)。将新视频插入到数组的最前面，让它显示在列表的第一位。
      if (info.file.status === 'done') {
        const serverData = info.file.response.data
        videoList.value.unshift(serverData)
        message.success('视频已保存至数据库')
      } else if (info.file.status === 'error') {
        message.error('文件上传失败，请检查后端服务')
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