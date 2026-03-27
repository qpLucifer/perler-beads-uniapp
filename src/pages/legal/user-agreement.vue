<template>
  <view class="legal-page">
    <view class="section">
      <text class="title">{{ title || '用户协议' }}</text>
      <text class="date">生效日期：{{ effectiveDateText }}</text>
      <text class="date">版本：{{ version || 'v1.0.0' }}</text>
    </view>

    <view v-if="loading" class="section">
      <text class="p">加载中...</text>
    </view>
    <view v-else-if="error" class="section">
      <text class="p error">{{ error }}</text>
    </view>
    <view v-else class="section">
      <text class="p content">{{ content }}</text>
    </view>
  </view>
</template>

<script>
import { getLegalDoc } from '@/api'

export default {
  name: 'UserAgreementPage',
  data() {
    return {
      title: '用户协议',
      content: '',
      version: '',
      effectiveDate: '',
      loading: false,
      error: ''
    }
  },
  computed: {
    effectiveDateText() {
      return this.effectiveDate || '未设置'
    }
  },
  onLoad() {
    this.fetchDoc()
  },
  methods: {
    async fetchDoc() {
      this.loading = true
      this.error = ''
      try {
        const res = await getLegalDoc('user_agreement')
        const doc = res?.data || {}
        this.title = doc.title || '用户协议'
        this.content = doc.content || ''
        this.version = doc.version || 'v1.0.0'
        this.effectiveDate = doc.effective_date || ''
      } catch (e) {
        this.error = '获取协议失败，请稍后重试'
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.legal-page {
  min-height: 100vh;
  background: #f6f8ff;
  padding: 28rpx;
}

.section {
  background: #ffffff;
  border-radius: 18rpx;
  padding: 24rpx;
  margin-bottom: 18rpx;
  box-shadow: 0 8rpx 18rpx rgba(16, 28, 80, 0.06);
}

.title {
  display: block;
  font-size: 38rpx;
  color: #1f2853;
  font-weight: 700;
}

.date {
  display: block;
  margin-top: 10rpx;
  color: #6a7398;
  font-size: 23rpx;
}

.h2 {
  display: block;
  font-size: 30rpx;
  color: #273162;
  font-weight: 700;
}

.p {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #4a5276;
  line-height: 1.8;
  white-space: pre-wrap;
}

.content {
  min-height: 220rpx;
}

.error {
  color: #d94848;
}
</style>
