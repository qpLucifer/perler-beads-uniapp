<template>
  <view class="gallery-page">
    <view class="gallery-header">
      <text class="header-title">🎨 作品展示</text>
      <text class="header-subtitle">欣赏其他用户的精彩拼豆作品</text>
    </view>
    
    <view class="gallery-grid">
      <view class="gallery-item" v-for="i in 12" :key="i">
        <view class="gallery-image">
          <text class="image-placeholder">🖼️</text>
        </view>
        <view class="gallery-info">
          <text class="gallery-title">用户作品 {{ i }}</text>
          <text class="gallery-author">作者：用户{{ i }}号</text>
          <view class="gallery-stats">
            <text class="stat-item">⭐ {{ i * 100 }}</text>
            <text class="stat-item">👍 {{ i * 50 }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const viewArtwork = () => {
  uni.showToast({ title: '作品详情开发中...', icon: 'none' })
}
</script>

<style lang="scss" scoped>
$primary-color: #667eea;
$secondary-color: #764ba2;

.gallery-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 40rpx;
}

.gallery-header {
  background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
  padding: 80rpx 30rpx 60rpx;
  text-align: center;
  
  .header-title {
    display: block;
    font-size: 44rpx;
    font-weight: bold;
    color: white;
    margin-bottom: 16rpx;
  }
  
  .header-subtitle {
    display: block;
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.9);
  }
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
  padding: 30rpx 24rpx;
}

.gallery-item {
  background: white;
  border-radius: 24rpx;
  overflow: hidden;
  
  .gallery-image {
    height: 300rpx;
    background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    
    .image-placeholder {
      font-size: 100rpx;
    }
  }
  
  .gallery-info {
    padding: 24rpx;
    
    .gallery-title {
      display: block;
      font-size: 30rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 12rpx;
    }
    
    .gallery-author {
      display: block;
      font-size: 26rpx;
      color: #666;
      margin-bottom: 16rpx;
    }
    
    .gallery-stats {
      display: flex;
      gap: 24rpx;
      
      .stat-item {
        font-size: 26rpx;
        color: #666;
      }
    }
  }
}
</style>
