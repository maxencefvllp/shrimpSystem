<template>
  <a-card title="算法库管理">
    <template #extra>
      <a-button type="primary" @click="showUploadModal">
        <template #icon><icon-font type="icon-upload" /></template>
        上传算法包
      </a-button>
    </template>

    <a-table :dataSource="algoList" :columns="columns" rowKey="id">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a :href="record.file_url" target="_blank">下载</a>
          <a-divider type="vertical" />
          <a-button type="link" danger @click="handleDelete(record.id)">删除</a-button>
        </template>
      </template>
    </a-table>

    <a-modal v-model:visible="modalVisible" title="新增算法" @ok="handleModalOk">
      <a-form :model="formState" layout="vertical">
        <a-form-item label="算法名称">
          <a-input v-model:value="formState.name" placeholder="请输入算法名称" />
        </a-form-item>
        <a-form-item label="版本号">
          <a-input v-model:value="formState.version" placeholder="例如 v1.0.0" />
        </a-form-item>
        <a-form-item label="算法文件">
          <a-upload :file-list="fileList" :before-upload="beforeUpload" :max-count="1">
            <a-button>选择文件 (.zip/.pt)</a-button>
          </a-upload>
        </a-form-item>
      </a-form>
    </a-modal>
  </a-card>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { getAlgorithmList, deleteAlgorithm } from '@/api';
import axios from 'axios';
interface AlgorithmItem {
  id: number;
  name: string;
  version: string;
  file_url: string;
  description: string;
  upload_time: string;
}
export default defineComponent({
  setup() {
    // 明确定义数组类型
    const algoList = ref<AlgorithmItem[]>([])
    const modalVisible = ref(false)
    const uploading = ref(false)
    const fileList = ref<any[]>([])
    const formState = ref({
      name: '',
      version: '',
      description: ''
    })

    const columns = [
      { title: '算法名称', dataIndex: 'name', key: 'name' },
      { title: '版本', dataIndex: 'version', key: 'version' },
      { title: '上传时间', dataIndex: 'upload_time', key: 'upload_time' },
      { title: '操作', key: 'action' }
    ]

    // 获取列表
    const fetchAlgos = async () => {
      try {
        const res = await getAlgorithmList()
        if (res && res.code === 1) {
          algoList.value = res.data
          console.log('算法库加载成功:', algoList.value)
        }
      } catch (error) {
        message.error('算法列表加载失败')
      }
    }

    // 删除算法：解决报错1
    const handleDelete = async (id: number) => {
      try {
        const res = await deleteAlgorithm(id)
        if (res.code === 1) {
          message.success('算法已移除')
          fetchAlgos()
        }
      } catch (error) {
        message.error('删除失败')
      }
    }

    // 上传前的处理：阻止自动上传，改为手动控制
    const beforeUpload = (file: any) => {
      fileList.value = [file]
      return false
    }

    // 弹窗确认上传
    const handleModalOk = async () => {
      if (fileList.value.length === 0) return message.warning('请先选择文件')
      if (!formState.value.name || !formState.value.version) return message.warning('请填写完整信息')

      uploading.value = true
      const formData = new FormData()
      formData.append('file', fileList.value[0])
      formData.append('name', formState.value.name)
      formData.append('version', formState.value.version)
      formData.append('description', formState.value.description)

      try {
        // 直接调用后端地址，绕过封装的请求拦截器处理 FormData 兼容性
        const res = await axios.post('/api/upload/algorithm', formData)
        if (res.data.code === 1) {
          message.success('算法包上传并保存成功')
          modalVisible.value = false
          fileList.value = []
          formState.value = { name: '', version: '', description: '' }
          fetchAlgos()
        }
      } catch (error) {
        message.error('上传过程出错')
      } finally {
        uploading.value = false
      }
    }

    const showUploadModal = () => {
      modalVisible.value = true
    }

    onMounted(() => {
      fetchAlgos()
    })

    // --- 重点：所有在 template 里用到的变量和函数都必须在这里返回 ---
    return {
      algoList,
      columns,
      modalVisible,
      uploading,
      formState,
      fileList,
      showUploadModal,
      handleDelete, // 必须返回，解决 Property 'handleDelete' does not exist
      beforeUpload,
      handleModalOk
    }
  }
})
</script>

<style scoped>
.ant-card {
  margin: 10px;
}
</style>