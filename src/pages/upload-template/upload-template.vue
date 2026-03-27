<template>
  <view class="upload-page">
    <view class="hero">
      <view class="hero-top">
        <text class="hero-title">模板上传工作台</text>
        <text class="hero-tag">AI 辅助</text>
      </view>
      <text class="hero-subtitle">上传图片，自动生成拼豆画布 JSON，一键回填后直接上传模板</text>
      <view class="flow">
        <view class="flow-node">
          <text class="flow-icon">🖼️</text>
          <text class="flow-text">选图</text>
        </view>
        <text class="flow-sep">➜</text>
        <view class="flow-node">
          <text class="flow-icon">🤖</text>
          <text class="flow-text">AI 识别</text>
        </view>
        <text class="flow-sep">➜</text>
        <view class="flow-node">
          <text class="flow-icon">🧩</text>
          <text class="flow-text">自动回填</text>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="section-title-row">
        <text class="section-title">基础信息</text>
      </view>

      <view class="field">
        <text class="field-label">模板名称</text>
        <input
          class="field-input"
          v-model="templateName"
          placeholder="例如：樱花小熊 / 像素狗狗"
          type="text"
        />
      </view>

      <view class="field-grid">
        <view class="field">
          <text class="field-label">分类</text>
          <picker :range="categories" @change="onCategoryChange">
            <view class="field-picker">
              <text>{{ categories[selectedCategory] }}</text>
              <text class="picker-icon">⌄</text>
            </view>
          </picker>
        </view>
        <view class="field">
          <text class="field-label">难度</text>
          <picker :range="difficulties" @change="onDifficultyChange">
            <view class="field-picker">
              <text>{{ difficulties[selectedDifficulty] }}</text>
              <text class="picker-icon">⌄</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="field">
        <text class="field-label">画布大小</text>
        <picker :range="canvasSizes" @change="onCanvasSizeChange">
          <view class="field-picker">
            <text>{{ canvasSizes[selectedCanvasSize] }}</text>
            <text class="picker-icon">⌄</text>
          </view>
        </picker>
      </view>
    </view>

    <view class="card">
      <view class="section-title-row">
        <text class="section-title">AI 识别生成</text>
      </view>

      <view class="action-row">
        <button class="action-btn ghost" @tap="chooseImage">选择图片</button>
        <button class="action-btn solid" @tap="generateByAI" :loading="aiLoading" :disabled="aiLoading">
          {{ aiLoading ? '识别中...' : '开始生成' }}
        </button>
      </view>

      <view v-if="selectedImagePath" class="preview-wrap">
        <image class="preview-image" :src="selectedImagePath" mode="aspectFit" />
      </view>
      <text v-if="selectedImageName" class="tips">已选图片：{{ selectedImageName }}</text>
      <text class="tips">建议：主体居中、背景简洁、边缘清晰，生成效果更稳定</text>

      <view v-if="aiLoading" class="progress">
        <view class="progress-track">
          <view class="progress-inner" :style="{ width: aiProgress + '%' }"></view>
        </view>
        <text class="progress-label">{{ aiProgress }}% · {{ aiProgressText }}</text>
      </view>
    </view>

    <view class="card">
      <view class="section-title-row">
        <text class="section-title">画布 JSON</text>
      </view>
      <textarea
        class="json-area"
        v-model="canvasDataStr"
        placeholder="粘贴画布数据 (JSON 格式)"
        :maxlength="50000"
      />
      <text class="tips">可粘贴创作中心导出的画布数据，也可使用上方 AI 自动回填结果</text>
    </view>

    <view class="card">
      <view class="section-title-row">
        <text class="section-title">示例格式</text>
      </view>
      <textarea class="json-area sample" :value="sampleJson" disabled />
    </view>

    <view class="card">
      <view class="section-title-row">
        <text class="section-title">最近 AI 任务（最多 5 条）</text>
      </view>
      <view v-if="aiTaskHistory.length === 0" class="tips">暂无记录</view>
      <view v-for="item in aiTaskHistory" :key="item.id" class="history-item">
        <view class="history-head">
          <text class="task-badge" :class="`status-${item.status}`">{{ formatTaskStatus(item.status) }}</text>
          <text class="history-meta">{{ item.createdAt }} · 耗时 {{ item.elapsedSec }}s</text>
        </view>
        <view class="history-body">
          <button
            v-if="item.status === 'succeeded' && item.result"
            class="mini-btn"
            @tap="applyHistoryResult(item)"
          >回填结果</button>
          <text v-else class="error-text">{{ item.error || '处理中...' }}</text>
        </view>
      </view>
    </view>

    <view class="footer">
      <button class="submit-btn" @tap="handleUpload" :loading="loading">
        {{ loading ? '上传中...' : '上传模板' }}
      </button>
    </view>
  </view>
</template>

<script>
import { userStore } from '@/stores/user.js'
import { cloudStore } from '@/stores/cloud.js'
import { beadStore } from '@/stores/bead.js'
import { createTemplateAiJob, getTemplateAiJob } from '@/api'

export default {
  onLoad() {
    this.loadHistory()
  },
  onUnload() {
    this.stopTaskPolling()
    this.stopAiProgress()
    if (this.aiProgressTimer) {
      clearInterval(this.aiProgressTimer)
      this.aiProgressTimer = null
    }
  },
  data() {
    return {
      templateName: '',
      categories: ['动物', '卡通', '图案', '食物', '人物', '其他'],
      selectedCategory: 0,
      difficulties: ['简单', '中等', '困难'],
      selectedDifficulty: 0,
      canvasSizes: ['16×16', '32×32', '48×48'],
      selectedCanvasSize: 1,
      canvasDataStr: '',
      loading: false,
      aiLoading: false,
      aiProgress: 0,
      aiProgressText: '准备中...',
      aiProgressTimer: null,
      aiStartedAt: 0,
      activeTaskId: '',
      aiPollTimer: null,
      aiTaskHistory: [],
      selectedImageBase64: '',
      selectedImageName: '',
      selectedImagePath: '',
      sampleJson: JSON.stringify([
        [{ "id": 2, "name": "黑色", "hex": "#000000", "price": 0.1 }, null, null],
        [null, { "id": 3, "name": "红色", "hex": "#FF0000", "price": 0.1 }, null],
        [null, null, { "id": 7, "name": "蓝色", "hex": "#0000FF", "price": 0.1 }]
      ], null, 2)
    }
  },

  methods: {
    historyStorageKey() {
      return 'upload_template_ai_task_history'
    },

    saveHistory() {
      try {
        uni.setStorageSync(this.historyStorageKey(), JSON.stringify(this.aiTaskHistory))
      } catch (e) {
        // ignore
      }
    },

    loadHistory() {
      try {
        const raw = uni.getStorageSync(this.historyStorageKey())
        if (!raw) return
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.aiTaskHistory = parsed.slice(0, 5)
        }
      } catch (e) {
        // ignore
      }
    },

    onCategoryChange(e) {
      this.selectedCategory = e.detail.value
    },

    onDifficultyChange(e) {
      this.selectedDifficulty = e.detail.value
    },

    onCanvasSizeChange(e) {
      this.selectedCanvasSize = e.detail.value
    },

    chooseImage() {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: async (res) => {
          const path = res?.tempFilePaths?.[0]
          if (!path) return
          this.selectedImagePath = path
          this.selectedImageName = path.split('/').pop() || path.split('\\').pop() || 'image'
          try {
            const fsm = uni.getFileSystemManager()
            const readRes = await new Promise((resolve, reject) => {
              fsm.readFile({
                filePath: path,
                encoding: 'base64',
                success: resolve,
                fail: reject
              })
            })
            this.selectedImageBase64 = readRes.data || ''
            uni.showToast({ title: '图片已选择', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: '读取图片失败', icon: 'none' })
          }
        }
      })
    },

    async generateByAI() {
      if (this.aiLoading) return
      if (this.activeTaskId) {
        uni.showToast({ title: '已有任务进行中', icon: 'none' })
        return
      }
      if (!this.selectedImageBase64) {
        uni.showToast({ title: '请先选择图片', icon: 'none' })
        return
      }
      this.aiLoading = true
      this.aiProgress = 0
      this.aiProgressText = '图片上传中...'
      this.aiStartedAt = Date.now()
      this.startAiProgress()
      try {
        const canvasSize = this.selectedCanvasSize === 0 ? 16 : (this.selectedCanvasSize === 1 ? 32 : 48)
        const createRes = await createTemplateAiJob({
          image_base64: this.selectedImageBase64,
          canvas_size: canvasSize
        })
        const taskId = createRes?.data?.task_id
        if (!createRes.success || !taskId) throw new Error(createRes?.message || '创建任务失败')
        this.activeTaskId = taskId
        this.pushTaskHistory({
          id: `${taskId}_queued`,
          taskId,
          status: 'queued',
          createdAt: new Date().toLocaleTimeString(),
          elapsedSec: 0,
          result: null,
          error: ''
        })
        this.aiProgressText = '任务已创建，开始处理中...'
        this.startTaskPolling(taskId)
      } catch (e) {
        uni.showToast({ title: e.message || 'AI 生成失败', icon: 'none' })
        this.activeTaskId = ''
        this.aiLoading = false
        this.stopAiProgress()
        return
      } finally {
        // keep loading until polling reaches succeeded/failed
      }
    },

    startAiProgress() {
      this.stopAiProgress()
      this.aiProgressTimer = setInterval(() => {
        if (!this.aiLoading) return
        const elapsedSec = Math.floor((Date.now() - this.aiStartedAt) / 1000)
        if (this.aiProgress < 30) {
          this.aiProgress += 5
          this.aiProgressText = `图片上传中...（${elapsedSec}s）`
        } else if (this.aiProgress < 75) {
          this.aiProgress += 2
          this.aiProgressText = `AI 正在识别图像...（${elapsedSec}s）`
        } else if (this.aiProgress < 95) {
          this.aiProgress += 1
          this.aiProgressText = `正在生成拼豆 JSON...（${elapsedSec}s）`
        }
      }, 600)
    },

    formatTaskStatus(status) {
      const map = {
        queued: '排队中',
        running: '运行中',
        succeeded: '成功',
        failed: '失败'
      }
      return map[status] || '处理中'
    },

    startTaskPolling(taskId) {
      this.stopTaskPolling()
      this.fetchTaskOnce(taskId)
      this.aiPollTimer = setInterval(() => {
        this.fetchTaskOnce(taskId)
      }, 1800)
    },

    stopTaskPolling() {
      if (this.aiPollTimer) {
        clearInterval(this.aiPollTimer)
        this.aiPollTimer = null
      }
    },

    updateTaskHistory(taskId, patch) {
      const idx = this.aiTaskHistory.findIndex((r) => r.taskId === taskId)
      if (idx === -1) return
      const old = this.aiTaskHistory[idx]
      this.aiTaskHistory.splice(idx, 1, {
        ...old,
        ...patch,
        id: `${taskId}_${patch.status || old.status || 'queued'}`
      })
      this.saveHistory()
    },

    async fetchTaskOnce(taskId) {
      try {
        const res = await getTemplateAiJob(taskId)
        if (!res.success) throw new Error(res.message || '任务查询失败')
        const task = res.data || {}
        if (Number.isFinite(Number(task.progress))) {
          this.aiProgress = Math.max(this.aiProgress, Number(task.progress))
        }
        if (task.progress_text) {
          this.aiProgressText = task.progress_text
        }
        const elapsedSec = Math.max(1, Math.floor((Date.now() - this.aiStartedAt) / 1000))
        this.updateTaskHistory(taskId, {
          status: task.status || 'running',
          elapsedSec,
          error: task.error || '',
          result: task.result || null
        })

        if (task.status === 'succeeded') {
          if (task.result?.canvas_data) {
            this.canvasDataStr = JSON.stringify(task.result.canvas_data, null, 2)
          }
          this.aiProgress = 100
          this.aiProgressText = '生成完成，已自动回填'
          this.stopTaskPolling()
          this.stopAiProgress()
          this.aiLoading = false
          this.activeTaskId = ''
          uni.showToast({ title: 'AI 生成成功', icon: 'success' })
        } else if (task.status === 'failed') {
          this.stopTaskPolling()
          this.stopAiProgress()
          this.aiLoading = false
          this.activeTaskId = ''
          uni.showToast({ title: task.error || 'AI 生成失败', icon: 'none' })
        }
      } catch (e) {
        this.aiProgressText = '任务查询失败，稍后重试...'
      }
    },

    pushTaskHistory(record) {
      this.aiTaskHistory = [record, ...this.aiTaskHistory].slice(0, 5)
      this.saveHistory()
    },

    applyHistoryResult(item) {
      if (!item?.result?.canvas_data) return
      this.canvasDataStr = JSON.stringify(item.result.canvas_data, null, 2)
      uni.showToast({ title: '已回填历史结果', icon: 'success' })
    },

    stopAiProgress() {
      if (this.aiProgressTimer) {
        clearInterval(this.aiProgressTimer)
        this.aiProgressTimer = null
      }
    },

    async handleUpload() {
      // 验证输入
      if (!this.templateName) {
        uni.showToast({
          title: '请输入模板名称',
          icon: 'none'
        })
        return
      }

      if (!this.canvasDataStr) {
        uni.showToast({
          title: '请输入画布数据',
          icon: 'none'
        })
        return
      }

      // 解析画布数据
      let canvasData
      try {
        canvasData = JSON.parse(this.canvasDataStr)
        if (!Array.isArray(canvasData)) {
          throw new Error('无效的画布数据')
        }
      } catch (e) {
        uni.showToast({
          title: '画布数据格式错误',
          icon: 'none'
        })
        return
      }

      this.loading = true

      try {
        const canvasSize = this.selectedCanvasSize === 0 ? 16 : (this.selectedCanvasSize === 1 ? 32 : 48)
        
        const template = {
          name: this.templateName,
          category: this.categories[this.selectedCategory],
          difficulty: this.difficulties[this.selectedDifficulty],
          canvasSize: { width: canvasSize, height: canvasSize },
          canvasData: canvasData,
          thumbnail: '🎨'
        }

        const result = await cloudStore.uploadTemplate(template)
        
        if (result.success) {
          uni.showToast({
            title: '上传成功',
            icon: 'success'
          })

          setTimeout(() => {
            uni.navigateBack()
          }, 1000)
        } else {
          uni.showToast({
            title: result.message,
            icon: 'none'
          })
        }
      } catch (e) {
        uni.showToast({
          title: '上传失败，请稍后重试',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.upload-page {
  min-height: 100vh;
  padding: 28rpx 24rpx 160rpx;
  background: linear-gradient(180deg, #eef3ff 0%, #f6f8ff 34%, #fbfcff 100%);
}

.hero {
  border-radius: 28rpx;
  padding: 26rpx 24rpx;
  background: linear-gradient(135deg, #4c65ff 0%, #7058e7 55%, #9a4dde 100%);
  box-shadow: 0 16rpx 42rpx rgba(74, 94, 255, 0.28);
  margin-bottom: 18rpx;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-title {
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
}

.hero-tag {
  color: #fff;
  font-size: 22rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.24);
}

.hero-subtitle {
  margin-top: 10rpx;
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
  line-height: 1.5;
}

.flow {
  margin-top: 18rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.flow-node {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
}

.flow-icon {
  font-size: 24rpx;
}

.flow-text {
  color: #fff;
  font-size: 22rpx;
}

.flow-sep {
  color: rgba(255, 255, 255, 0.9);
  font-size: 22rpx;
}

.card {
  margin-top: 16rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 22rpx;
  box-shadow: 0 10rpx 28rpx rgba(26, 42, 98, 0.08);
}

.section-title-row {
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 30rpx;
  color: #1f2a44;
  font-weight: 600;
}

.field {
  margin-bottom: 18rpx;
}

.field:last-child {
  margin-bottom: 0;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 25rpx;
  color: #44506b;
}

.field-input,
.field-picker {
  min-height: 84rpx;
  border-radius: 16rpx;
  background: #f3f6ff;
  border: 1rpx solid #e4eaff;
  padding: 0 20rpx;
  font-size: 27rpx;
  color: #2a3550;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-icon {
  color: #7080b8;
  font-size: 24rpx;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12rpx;
}

.action-btn {
  height: 82rpx;
  line-height: 82rpx;
  border-radius: 14rpx;
  font-size: 27rpx;
  border: none;
}

.action-btn.ghost {
  color: #4e62d8;
  background: #eef2ff;
}

.action-btn.solid {
  color: #fff;
  background: linear-gradient(135deg, #5871ff 0%, #7557e9 100%);
}

.preview-wrap {
  margin-top: 14rpx;
  border-radius: 16rpx;
  overflow: hidden;
  border: 1rpx solid #e5eaff;
  background: #f2f5ff;
}

.preview-image {
  width: 100%;
  height: 300rpx;
}

.tips {
  margin-top: 10rpx;
  display: block;
  font-size: 23rpx;
  color: #7382a8;
  line-height: 1.5;
}

.progress {
  margin-top: 14rpx;
  border-radius: 14rpx;
  background: #f6f8ff;
  border: 1rpx solid #e9edff;
  padding: 12rpx;
}

.progress-track {
  height: 14rpx;
  border-radius: 999rpx;
  overflow: hidden;
  background: #e8edff;
}

.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #5a72ff, #7f58eb);
  transition: width 0.25s ease;
}

.progress-label {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: #546190;
}

.json-area {
  width: 100%;
  min-height: 260rpx;
  border-radius: 16rpx;
  background: #f6f8ff;
  border: 1rpx solid #e8edff;
  padding: 18rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #2f3958;
}

.json-area.sample {
  color: #5f6a89;
}

.history-item {
  margin-top: 10rpx;
  border: 1rpx solid #e8edff;
  background: #f8faff;
  border-radius: 14rpx;
  padding: 12rpx;
}

.history-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.task-badge {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}

.status-succeeded {
  color: #158c58;
  background: #e8f9ef;
}

.status-running {
  color: #3f56d1;
  background: #ebf0ff;
}

.status-queued {
  color: #b77210;
  background: #fff3e5;
}

.status-failed {
  color: #cb3c3c;
  background: #ffecec;
}

.history-meta {
  font-size: 22rpx;
  color: #6e7aa2;
}

.history-body {
  margin-top: 8rpx;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.mini-btn {
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 999rpx;
  padding: 0 22rpx;
  font-size: 24rpx;
  color: #4b60d6;
  background: #edf1ff;
  border: none;
}

.error-text {
  font-size: 22rpx;
  color: #d14747;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx 24rpx calc(env(safe-area-inset-bottom) + 16rpx);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10rpx);
  border-top: 1rpx solid #e8edff;
}

.submit-btn {
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 14rpx;
  color: #fff;
  font-size: 31rpx;
  font-weight: 600;
  background: linear-gradient(135deg, #5a72ff 0%, #724fe1 100%);
  border: none;
}

.submit-btn::after {
  border: none;
}
</style>
