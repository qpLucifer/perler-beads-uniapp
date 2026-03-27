<template>
  <view class="index-page">
    <!-- 自定义导航栏 -->
    <view class="custom-header">
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      <view class="header-content">
        <view class="logo">
          <view class="logo-icon-wrapper">
            <text class="logo-icon">🔵</text>
          </view>
          <text class="logo-text">拼豆 DIY</text>
        </view>
      </view>
    </view>

    <!-- 横幅区域 -->
    <view class="hero">
      <view class="hero-stars">
        <text class="star s1">✦</text>
        <text class="star s2">✦</text>
        <text class="star s3">✧</text>
        <text class="star s4">✦</text>
      </view>
      <view class="hero-content">
        <view class="hero-badge">✨ 创意无限</view>
        <text class="hero-title">拼豆 DIY 创作平台</text>
        <text class="hero-subtitle">自由设计拼豆图案，一键下单邮寄到家</text>
        <view class="hero-buttons">
          <button class="btn btn-primary" @tap="goToEditor">
            <text class="btn-icon">✏️</text>
            <text>开始创作</text>
          </button>
          <button class="btn btn-ghost" @tap="goToShop">
            <text class="btn-icon">🛒</text>
            <text>商城</text>
          </button>
          <button class="btn btn-ghost" @tap="goToTemplates">
            <text class="btn-icon">📚</text>
            <text>浏览模板</text>
          </button>
        </view>
      </view>
    </view>

    <view class="quick-grid">
      <view class="quick-card" @tap="goToEditor">
        <text class="q-icon">🎨</text>
        <text class="q-title">新建创作</text>
        <text class="q-sub">从空白画布开始</text>
      </view>
      <view class="quick-card" @tap="goToTemplates">
        <text class="q-icon">📚</text>
        <text class="q-title">套用模板</text>
        <text class="q-sub">快速生成作品</text>
      </view>
      <view class="quick-card" @tap="goToShop">
        <text class="q-icon">🛒</text>
        <text class="q-title">购买材料</text>
        <text class="q-sub">拼豆/底板/工具</text>
      </view>
    </view>

    <!-- 功能特点 -->
    <view class="features">
      <view class="section-header">
        <text class="section-title">为什么选择我们</text>
        <text class="section-subtitle">四大核心优势，让创作更简单</text>
      </view>
      <view class="feature-grid">
        <view class="feature-card" v-for="(feature, index) in features" :key="index">
          <view class="feature-icon-wrapper">
            <text class="feature-icon">{{ feature.icon }}</text>
          </view>
          <text class="feature-title">{{ feature.title }}</text>
          <text class="feature-desc">{{ feature.description }}</text>
        </view>
      </view>
    </view>

    <!-- 热门模板 -->
    <view class="templates-section">
      <view class="section-header">
        <text class="section-title">🔥 热门模板</text>
        <text class="section-subtitle">精选优质模板，一键使用</text>
      </view>
      <view class="template-grid">
        <view class="template-card" v-for="template in hotTemplates" :key="template.id" @tap="useTemplate(template)">
          <view class="template-thumbnail">
            <view
              v-if="template.thumbGrid && template.thumbGrid.length"
              class="thumb-wrap"
            >
              <view
                v-for="(hex, i) in template.thumbGrid"
                :key="i"
                class="thumb-cell"
                :style="{
                  backgroundColor: hex || 'transparent',
                  width: `${100 / thumbSize}%`,
                  height: `${100 / thumbSize}%`
                }"
              />
            </view>
            <text v-else class="thumb-fallback">{{ template.thumbnail }}</text>
          </view>
          <view class="template-content">
            <text class="template-name">{{ template.name }}</text>
            <view class="template-meta">
              <text class="template-difficulty" :class="getDifficultyClass(template.difficulty)">{{ template.difficulty }}</text>
              <text class="template-downloads">👍 {{ formatNumber(template.downloads) }}</text>
            </view>
          </view>
          <view class="template-arrow">›</view>
        </view>
      </view>
      <view class="view-all" @tap="goToTemplates">
        <text>查看全部模板</text>
        <text class="arrow">→</text>
      </view>
    </view>

    <!-- CTA 区域 -->
    <view class="cta-section">
      <view class="cta-content">
        <text class="cta-title">准备好开始创作了吗？</text>
        <text class="cta-subtitle">数千种颜色，无限种可能</text>
        <button class="btn btn-large" @tap="goToEditor">
          <text>立即开始</text>
          <text class="btn-arrow">→</text>
        </button>
      </view>
    </view>

    <!-- 底部占位 -->
    <view style="height: 200rpx;"></view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import beadStore from '@/stores/bead'

const statusBarHeight = ref(0)

// #ifdef H5
statusBarHeight.value = 0
// #endif

// #ifdef MP-WEIXIN
statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 20
// #endif

const features = [
  { icon: '🎨', title: '自由创作', description: '32x32 超大画布，20 种颜色可选' },
  { icon: '📚', title: '海量模板', description: '数百个热门模板，一键使用' },
  { icon: '🛒', title: '一键购买', description: '设计完成后直接下单' },
  { icon: '💾', title: '云端保存', description: '作品自动保存' }
]

const hotTemplates = computed(() => {
  const list = Array.isArray(beadStore.templates) ? beadStore.templates : []
  return list.slice(0, 4).map(tpl => ({
    ...tpl,
    thumbGrid: buildThumbGrid(tpl.canvasData)
  }))
})

const thumbSize = 8

function buildThumbGrid(canvasData) {
  const size = thumbSize
  if (!Array.isArray(canvasData) || canvasData.length === 0) {
    return Array(size * size).fill(null)
  }
  const height = canvasData.length
  const width = Array.isArray(canvasData[0]) ? canvasData[0].length : size

  const stepY = height / size
  const stepX = width / size

  const flat = []
  for (let ty = 0; ty < size; ty++) {
    for (let tx = 0; tx < size; tx++) {
      const y0 = Math.floor(ty * stepY)
      const y1 = Math.max(y0 + 1, Math.floor((ty + 1) * stepY))
      const x0 = Math.floor(tx * stepX)
      const x1 = Math.max(x0 + 1, Math.floor((tx + 1) * stepX))

      let chosen = null
      for (let y = y0; y < Math.min(y1, height); y++) {
        for (let x = x0; x < Math.min(x1, width); x++) {
          const c = canvasData[y]?.[x]
          if (c && c.hex) {
            chosen = c.hex
            break
          }
        }
        if (chosen) break
      }
      flat.push(chosen)
    }
  }
  return flat
}

const formatNumber = (num) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

const getDifficultyClass = (difficulty) => {
  const map = { '简单': 'difficulty-easy', '中等': 'difficulty-medium', '困难': 'difficulty-hard' }
  return map[difficulty] || ''
}

const goToEditor = () => {
  uni.switchTab({ url: '/pages/editor/editor' })
}

const goToShop = () => {
  uni.navigateTo({ url: '/pages/shop/shop' })
}

const goToTemplates = () => {
  uni.switchTab({ url: '/pages/templates/templates' })
}

const useTemplate = (template) => {
  if (!template) return
  uni.showModal({
    title: '使用模板',
    content: `确定要使用"${template.name}"模板开始创作吗？`,
    confirmText: '使用',
    success: (res) => {
      if (res.confirm) {
        uni.setStorageSync('using_template', JSON.stringify(template))
        uni.switchTab({ url: '/pages/editor/editor' })
      }
    }
  })
}

onShow(() => {
  beadStore.reloadTemplates()
})
</script>

<style lang="scss" scoped>
$primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

.index-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f7f8ff 0%, #f2f4fb 100%);
}

.custom-header {
  background: transparent;
  padding-top: var(--status-bar-height);

  .status-bar { width: 100%; }

  .header-content {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20rpx 20rpx 10rpx;
  }

  .logo {
    display: flex;
    align-items: center;

    .logo-icon-wrapper {
      width: 60rpx;
      height: 60rpx;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16rpx;
    }

    .logo-icon { font-size: 36rpx; color: #fff; }

    .logo-text {
      font-size: 38rpx;
      font-weight: 700;
      color: #2b2f42;
      letter-spacing: 1rpx;
    }
  }
}

.hero {
  background: $primary-gradient;
  margin: 10rpx 20rpx 0;
  border-radius: 28rpx;
  padding: 56rpx 30rpx 64rpx;
  text-align: center;
  color: #fff;
  box-shadow: 0 10rpx 36rpx rgba(102, 126, 234, 0.25);
  position: relative;
  overflow: hidden;

  .hero-stars {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .star {
    position: absolute;
    color: rgba(255, 255, 255, 0.88);
    text-shadow: 0 0 10rpx rgba(255, 255, 255, 0.55);
    animation: twinkle 2.6s ease-in-out infinite;
  }

  .s1 { top: 20rpx; left: 34rpx; font-size: 26rpx; animation-delay: 0s; }
  .s2 { top: 58rpx; right: 44rpx; font-size: 22rpx; animation-delay: 0.7s; }
  .s3 { bottom: 88rpx; left: 78rpx; font-size: 20rpx; animation-delay: 1.3s; }
  .s4 { bottom: 42rpx; right: 96rpx; font-size: 24rpx; animation-delay: 1.9s; }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -160%;
    width: 70%;
    height: 100%;
    background: linear-gradient(
      110deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.12) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    animation: hero-shimmer 4.8s ease-in-out infinite;
    pointer-events: none;
  }

  .hero-badge {
    display: inline-block;
    padding: 8rpx 22rpx;
    background: rgba(255, 255, 255, 0.18);
    border-radius: 26rpx;
    font-size: 22rpx;
    margin-bottom: 26rpx;
  }

  .hero-title {
    display: block;
    font-size: 46rpx;
    font-weight: 700;
    margin-bottom: 16rpx;
    animation: fade-up 0.45s ease both;
  }

  .hero-subtitle {
    display: block;
    font-size: 27rpx;
    margin-bottom: 32rpx;
    line-height: 1.6;
    opacity: 0.95;
    animation: fade-up 0.55s ease both;
  }

  .hero-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 18rpx;
    justify-content: center;

    .btn {
      min-width: 210rpx;
      padding: 20rpx 30rpx;
      border-radius: 999rpx;
      font-size: 28rpx;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10rpx;
      border: none;
      transform: translateZ(0);
      transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;

      &:active {
        transform: scale(0.97);
      }
    }

    .btn-primary {
      background: #fff;
      color: #667eea;
      box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
      animation: pulse-soft 2.8s ease-in-out infinite;
    }

    .btn-ghost {
      background: rgba(255, 255, 255, 0.18);
      color: #fff;
      border: 2rpx solid rgba(255, 255, 255, 0.35);
    }
  }
}

.quick-grid {
  margin: -20rpx 20rpx 24rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14rpx;

  .quick-card {
    background: #fff;
    border-radius: 16rpx;
    padding: 18rpx 14rpx;
    box-shadow: 0 8rpx 24rpx rgba(53, 66, 109, 0.08);
    border: 1rpx solid #edf0f8;
    transform: translateY(8rpx);
    opacity: 0;
    animation: fade-up 0.45s ease forwards;

    &:nth-child(1) { animation-delay: 0.05s; }
    &:nth-child(2) { animation-delay: 0.12s; }
    &:nth-child(3) { animation-delay: 0.19s; }

    &:active {
      transform: translateY(2rpx) scale(0.98);
    }
  }

  .q-icon { font-size: 34rpx; margin-bottom: 6rpx; display: block; }
  .q-title { display: block; font-size: 24rpx; color: #242a3f; font-weight: 600; margin-bottom: 4rpx; }
  .q-sub { display: block; font-size: 20rpx; color: #8d93a7; }
}

.features,
.templates-section {
  padding: 40rpx 24rpx;
  background: transparent;

  .section-header {
    text-align: center;
    margin-bottom: 40rpx;
  }

  .section-title { display: block; font-size: 40rpx; font-weight: 700; color: #333; margin-bottom: 10rpx; }
  .section-subtitle { display: block; font-size: 26rpx; color: #999; }
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.feature-card {
  text-align: center;
  padding: 32rpx 18rpx;
  background: #fff;
  border-radius: 20rpx;
  border: 1rpx solid #eef0f7;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:active {
    transform: translateY(-2rpx) scale(0.99);
    box-shadow: 0 10rpx 26rpx rgba(102, 126, 234, 0.16);
  }

  .feature-icon-wrapper {
    width: 92rpx;
    height: 92rpx;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 18rpx;
    box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.2);
  }

  .feature-icon { font-size: 52rpx; }
  .feature-title { display: block; font-size: 30rpx; font-weight: 600; color: #333; margin-bottom: 10rpx; }
  .feature-desc { display: block; font-size: 24rpx; color: #666; line-height: 1.5; }
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.template-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  text-align: center;
  border: 1rpx solid #eef0f7;
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.04);
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: float-template 4.6s ease-in-out infinite;

  &:nth-child(2n) {
    animation-name: float-template-alt;
    animation-duration: 5.2s;
  }

  &:nth-child(1) { animation-delay: 0.05s; }
  &:nth-child(2) { animation-delay: 0.35s; }
  &:nth-child(3) { animation-delay: 0.18s; }
  &:nth-child(4) { animation-delay: 0.5s; }

  &:active {
    transform: translateY(-2rpx) scale(0.99);
    box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.1);
  }

  .template-thumbnail {
    width: 120rpx;
    height: 120rpx;
    margin: 0 auto 14rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .thumb-grid {
    display: none;
  }

  .thumb-wrap {
    width: 112rpx;
    height: 112rpx;
    display: flex;
    flex-wrap: wrap;
    border-radius: 18rpx;
    overflow: hidden;
    background: rgba(102, 126, 234, 0.08);
  }

  .thumb-cell {
    flex: 0 0 auto;
    background-color: transparent;
  }

  .thumb-fallback {
    display: block;
    font-size: 84rpx;
  }

  .template-name { display: block; font-size: 28rpx; font-weight: 600; color: #333; margin-bottom: 10rpx; }
  .template-meta { display: flex; justify-content: center; gap: 12rpx; font-size: 22rpx; color: #666; }
  .template-arrow { position: absolute; top: 20rpx; right: 20rpx; font-size: 30rpx; color: #bbb; }
}

.view-all {
  text-align: center;
  padding: 24rpx;
  color: #667eea;
  font-size: 28rpx;
  font-weight: 500;
}

.cta-section {
  margin: 0 24rpx;
  border-radius: 24rpx;
  padding: 62rpx 30rpx;
  text-align: center;
  background: $primary-gradient;
  color: #fff;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.2);
  position: relative;
  overflow: hidden;

  .cta-title { display: block; font-size: 38rpx; font-weight: 700; margin-bottom: 14rpx; }
  .cta-subtitle { display: block; font-size: 26rpx; margin-bottom: 34rpx; opacity: 0.95; }

  .btn-large {
    padding: 26rpx 72rpx;
    background: #fff;
    color: #667eea;
    border-radius: 999rpx;
    font-size: 32rpx;
    font-weight: 600;
    border: none;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    &:active {
      transform: scale(0.97);
      box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
    }
  }
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(10rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-soft {
  0%, 100% {
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
  }
  50% {
    box-shadow: 0 12rpx 30rpx rgba(0, 0, 0, 0.2);
  }
}

@keyframes hero-shimmer {
  0%, 100% { left: -160%; }
  55% { left: 140%; }
}

@keyframes twinkle {
  0%, 100% {
    opacity: 0.35;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.15);
  }
}

@keyframes float-template {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(-2rpx, -6rpx, 0); }
}

@keyframes float-template-alt {
  0%, 100% { transform: translate3d(0, -2rpx, 0); }
  50% { transform: translate3d(2rpx, 5rpx, 0); }
}
</style>
