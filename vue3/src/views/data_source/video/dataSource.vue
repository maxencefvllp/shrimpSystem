<template>
  <a-card title="视频管理">
    <!-- 右上角添加按钮 -->
    <template #extra> 
      <a-button type="primary" @click="addModalVisible = true">
        <template #icon><icon-font type="icon-plus" /></template>
        添加视频资源
      </a-button>
    </template>
    
    <!-- 视频列表栅格布局 -->
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

    <!-- 添加视频的弹窗（已移到循环外，保留） -->
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
              :accept="videoAcceptTypes"
            >
              <p class="ant-upload-drag-icon"><icon-font type="icon-upload" /></p>
              <p class="ant-upload-text">点击或拖拽本地视频文件上传（支持mp4/avi/mov格式）</p>
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
            <a-alert message="提示：RTSP 流将自动开启 1 小时循环录制，需后端转码为HLS/FLV后才可预览" type="info" show-icon style="margin-bottom: 15px" />
            <!-- 修改：绑定submitting加载状态 -->
            <a-button type="primary" block @click="submitStream" :loading="submitting">
              确认接入
            </a-button>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-modal>

    <!-- 视频预览弹窗 -->
     <!-- 视频预览弹窗（核心修改：流式视频隐藏滑块） -->
    <a-modal
      v-model:visible="previewVisible"
      :title="previewTitle"
      width="800px"
      destroyOnClose
      @cancel="resetClipStatus"
    >
      <!-- 视频播放标签：两种类型视频都保留 -->
      <video
        ref="videoPlayer"
        v-if="previewUrl"
        :src="previewUrl"
        controls
        style="width: 100%; border-radius: 4px;"
        @loadedmetadata="onVideoLoaded"
      ></video>

      <!-- ❶ 流式视频：仅显示导出按钮（无滑块） -->
      <div v-if="previewUrl && currentVideo?.type === 'stream'" style="margin-top: 20px; padding: 0 10px;">
        <a-button 
          type="primary"  
          size="small"     
          :loading="exporting" 
          @click="handleExportStream"
        >
          导出当前流为mp4
        </a-button>
      </div>

      <!-- ❷ 本地文件视频：保留滑块、片段选取、剪辑按钮（原有逻辑） -->
      <div v-if="previewUrl && currentVideo?.type === 'file'" style="margin-top: 20px; padding: 0 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span>选取片段: {{ clipRange[0] }}s - {{ clipRange[1] }}s</span>
          <a-button 
            type="primary"  
            size="small"     
            :loading="clipping" 
            @click="confirmClip"
          >
            剪辑
          </a-button>
        </div>
        <a-slider
          range
          v-model:value="clipRange"
          :max="videoDuration"
          :tip-formatter="value => `${value}s`"
        />
      </div>
    </a-modal>
  </a-card>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getVideoList, deleteVideo, addStreamVideo, clipVideoApi, exportStreamVideo } from '@/api'

// 新增：定义TS接口，约束数据类型（替代any，提升代码严谨性和可维护性）
/** 视频数据通用接口 */
interface VideoItem {
  id: number
  name: string
  url: string
  size: string
  type: 'file' | 'stream' // 明确视频类型：本地文件/流式地址
}

/** 流表单数据接口 */
interface StreamForm {
  name: string
  url: string
}

export default defineComponent({
  setup() {
    // 修正：删除冗余变量agoList
    const videoList = ref<VideoItem[]>([]) // 新增：指定VideoItem数组类型
    const addModalVisible = ref(false)
    const activeTab = ref('local')
    const submitting = ref(false)

    // 新增：指定StreamForm类型，初始化表单数据
    const streamForm = ref<StreamForm>({
      name: '',
      url: ''
    })

    // 修正：从数据库拉取视频的逻辑（保留，优化类型提示）
    const fetchVideos = async () => {
      try {
        const res = await getVideoList()
        if (res && res.code === 1) {
          videoList.value = res.data as VideoItem[] // 新增：类型断言，确保数据符合VideoItem格式
        }
      } catch (error) {
        console.error('获取视频失败', error)
        message.error('获取视频列表失败，请刷新重试')
      }
    }
    
    const previewVisible = ref(false)
    const previewUrl = ref('')
    const previewTitle = ref('')
    const videoPlayer = ref<HTMLVideoElement | null>(null)
    const videoDuration = ref(0)
    const clipRange = ref<[number, number]>([0, 0])
    const clipping = ref(false)
    const exporting = ref(false)
    const currentVideo = ref<VideoItem | null>(null) // 新增：指定VideoItem|null类型

    // 新增：限制本地视频上传格式（避免上传非视频文件）
    const videoAcceptTypes = ref('.mp4,.avi,.mov,.flv,.webm')

    // 视频加载元数据回调（优化容错逻辑）
    const onVideoLoaded = () => {
      if (!videoPlayer.value) return // 新增：容错，避免null值操作

      videoDuration.value = Math.floor(videoPlayer.value.duration)
      // 对于直播流，duration 可能是 Infinity/NaN，做容错处理
      if (videoDuration.value === Infinity || isNaN(videoDuration.value)) {
        videoDuration.value = 3600 // 循环录制流默认设为1小时
      }
      // 避免默认结束时间大于视频总时长
      clipRange.value = [0, Math.min(60, videoDuration.value)]
    }

    const confirmClip = async () => {
      // 新增：剪辑时间范围合法性判断
      const [startTime, endTime] = clipRange.value
      if (startTime >= endTime) {
        return message.warning('结束时间必须大于开始时间')
      }
      if (!previewUrl.value || !previewTitle.value) {
        return message.warning('视频预览信息不完整，无法剪辑')
      }

      clipping.value = true
      try {
        const res = await clipVideoApi({
          sourceUrl: previewUrl.value,
          startTime,
          endTime,
          name: previewTitle.value
        })
        if (res.code === 1) {
          message.success('片段已另存为新视频')
          fetchVideos() // 刷新列表
          resetClipStatus() // 新增：剪辑成功后重置剪辑状态
          previewVisible.value = false // 新增：关闭预览弹窗
        } else {
          message.error(res.message || '剪辑保存失败')
        }
      } catch (error) {
        console.error('剪辑失败', error)
        message.error('剪辑保存失败，请检查后端接口')
      } finally {
        clipping.value = false
      }
    }

    const resetClipStatus = () => {
      clipRange.value = [0, 0]
      videoDuration.value = 0
      clipping.value = false
      exporting.value = false
    }

    // 优化：上传回调添加容错处理，避免后端返回格式异常报错
    const handleUploadChange = (info: any) => {
      if (info.file.status === 'done') {
        // 新增：多层容错，避免response不存在/格式错误
        const serverData = info.file.response?.data
        if (!serverData) {
          return message.error('上传成功，但未获取到视频数据')
        }
        videoList.value.unshift(serverData as VideoItem)
        message.success('本地视频上传成功')
        addModalVisible.value = false // 上传完成后自动关闭弹窗
      } else if (info.file.status === 'error') {
        message.error('上传失败，请检查文件格式或后端接口')
      }
    }

    // 提交流地址到后端的逻辑（优化容错和重置逻辑）
    const submitStream = async () => {
      const { name, url } = streamForm.value
      // 优化：更严谨的表单校验
      if (!name.trim()) {
        return message.warning('请填写视频名称')
      }
      if (!url.trim()) {
        return message.warning('请填写RTSP/HLS地址')
      }

      submitting.value = true
      try {
        const res = await addStreamVideo({ name, url })
        if (res.code === 1) {
          message.success('流地址已保存')
          addModalVisible.value = false // 关闭弹窗
          // 重置表单（清空输入值）
          streamForm.value = { name: '', url: '' }
          fetchVideos() // 重新拉取列表显示新数据
        } else {
          message.error(res.message || '保存流地址失败')
        }
      } catch (error) {
        console.error('保存流地址失败', error)
        message.error('保存流地址失败，请检查后端接口')
      } finally {
        submitting.value = false
      }
    }

    const removeVideo = async (id: number) => {
      try {
        const res = await deleteVideo(id)
        if (res.code === 1) {
          videoList.value = videoList.value.filter(v => v.id !== id)
          message.success('删除成功')
        } else {
          message.error(res.message || '删除操作失败')
        }
      } catch (error) {
        console.error('删除失败', error)
        message.error('删除操作失败，请检查后端接口')
      }
    }

    const handlePreview = (item: VideoItem) => {
      if (!item.url) return message.warning('该视频暂不可预览')
      console.log('当前视频完整数据：', item) 
      currentVideo.value = item
      previewUrl.value = item.url
      previewTitle.value = item.name
      previewVisible.value = true
    }

    const handleExportStream = async () => {
      if (!currentVideo.value) {
        return message.warning('无有效流式视频可导出')
      }

      exporting.value = true
      try {
        const res = await exportStreamVideo({
          url: currentVideo.value.url,
          name: currentVideo.value.name
        })
        
        if (res.code === 1) {
          message.success('导出成功！已保存为新视频，可进行剪辑')
          previewVisible.value = false
          fetchVideos()
          resetClipStatus()
        } else {
          message.error(res.message || '导出失败')
        }
      } catch (e) {
        console.error('导出流失败', e)
        message.error('请求失败，请检查网络或后端日志')
      } finally {
        exporting.value = false
      }
    }

    // 组件挂载时拉取视频列表
    onMounted(() => {
      fetchVideos()
    })

    return {
      videoList,
      previewVisible,
      previewUrl,
      previewTitle,
      addModalVisible,
      streamForm,
      activeTab,
      submitting,
      videoAcceptTypes, // 新增：返回视频格式限制变量
      handleUploadChange,
      handlePreview,
      removeVideo,
      submitStream,
      resetClipStatus,
      clipRange,
      clipping,
      confirmClip,
      videoPlayer,
      onVideoLoaded,
      videoDuration,
      handleExportStream,
      exporting,
      currentVideo
    }
  }
})
</script>

<style scoped>
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