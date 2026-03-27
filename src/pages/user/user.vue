<template>
  <view class="user-page">
    <!-- 用户卡片 -->
    <view class="user-card">
      <view v-if="isLoggedIn" class="user-info">
        <view class="avatar">
          <image v-if="user.avatar" :src="user.avatar" class="avatar-img" mode="aspectFill" />
          <text v-else class="avatar-icon">👤</text>
        </view>
        <view class="user-details">
          <text class="nickname">{{ user.username || '用户' }}</text>
          <text class="user-desc">ID: {{ user.id }}</text>
        </view>
        <button class="logout-btn" @click="handleLogout">退出</button>
      </view>
      <view v-else class="user-info" @click="goToLogin">
        <view class="avatar">
          <text class="avatar-icon">👤</text>
        </view>
        <view class="user-details">
          <text class="nickname">点击登录</text>
          <text class="user-desc">登录后享受更多服务</text>
        </view>
      </view>
      
      <view v-if="isLoggedIn" class="user-stats">
        <view class="stat-item">
          <text class="stat-value">{{ artworkCount }}</text>
          <text class="stat-label">作品</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-value">{{ orderCount }}</text>
          <text class="stat-label">订单</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-value">0</text>
          <text class="stat-label">积分</text>
        </view>
      </view>
    </view>

    <!-- 订单入口 -->
    <view class="order-section">
      <view class="order-header">
        <text class="section-title">我的订单</text>
        <text class="order-more" @click="goToOrders">全部订单 ›</text>
      </view>
      <view class="order-grid">
        <view class="order-item" @click="goToOrders('pending')">
          <text v-if="orderBadges.pending > 0" class="order-badge">{{ formatBadge(orderBadges.pending) }}</text>
          <text class="order-icon">💰</text>
          <text class="order-name">待付款</text>
        </view>
        <view class="order-item" @click="goToOrders('paid')">
          <text v-if="orderBadges.paid > 0" class="order-badge">{{ formatBadge(orderBadges.paid) }}</text>
          <text class="order-icon">📦</text>
          <text class="order-name">待发货</text>
        </view>
        <view class="order-item" @click="goToOrders('shipped')">
          <text v-if="orderBadges.shipped > 0" class="order-badge">{{ formatBadge(orderBadges.shipped) }}</text>
          <text class="order-icon">🚚</text>
          <text class="order-name">待收货</text>
        </view>
        <view class="order-item" @click="goToOrders('completed')">
          <text v-if="orderBadges.completed > 0" class="order-badge">{{ formatBadge(orderBadges.completed) }}</text>
          <text class="order-icon">✅</text>
          <text class="order-name">已完成</text>
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-section">
      <view class="menu-item" @click="goToMyArtworks">
        <text class="menu-icon">🎨</text>
        <text class="menu-name">我的作品</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToUploadTemplate">
        <text class="menu-icon">📤</text>
        <text class="menu-name">上传模板</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToAddress">
        <text class="menu-icon">📍</text>
        <text class="menu-name">收货地址</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToCoupons">
        <text class="menu-icon">🎫</text>
        <text class="menu-name">优惠券</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 其他菜单 -->
    <view class="menu-section">
      <view class="menu-item" @click="goToHelp">
        <text class="menu-icon">❓</text>
        <text class="menu-name">帮助中心</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @click="goToAbout">
        <text class="menu-icon">ℹ️</text>
        <text class="menu-name">关于我们</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { userStore } from '@/stores/user.js'
import { cloudStore } from '@/stores/cloud.js'
import { APP_EVENTS, onAppEvent, offAppEvent } from '@/utils/events.js'

const isLoggedIn = ref(false)
const user = ref({})
const artworkCount = ref(0)
const orderCount = ref(0)
const orderBadges = ref({
  pending: 0,
  paid: 0,
  shipped: 0,
  completed: 0
})

const checkLogin = () => {
  isLoggedIn.value = userStore.isLoggedIn
  if (isLoggedIn.value) {
    user.value = userStore.getUser() || {}
    loadStats()
  } else {
    user.value = {}
    artworkCount.value = 0
    orderCount.value = 0
    orderBadges.value = { pending: 0, paid: 0, shipped: 0, completed: 0 }
  }
}

const loadStats = async () => {
  try {
    // Keep user card fresh whenever page is shown.
    if (!userStore.getUser()) {
      await userStore.fetchUser()
      user.value = userStore.getUser() || {}
    }

    const artworksResult = await cloudStore.getArtworks()
    if (artworksResult.success) {
      artworkCount.value = artworksResult.artworks.length
    }

    const ordersResult = await cloudStore.getOrders()
    if (ordersResult.success) {
      const orders = Array.isArray(ordersResult.orders) ? ordersResult.orders : []
      orderCount.value = orders.length
      const nextBadges = { pending: 0, paid: 0, shipped: 0, completed: 0 }
      orders.forEach((o) => {
        const s = o?.status
        if (s === 'pending') nextBadges.pending += 1
        else if (s === 'paid') nextBadges.paid += 1
        else if (s === 'shipped') nextBadges.shipped += 1
        else if (s === 'completed') nextBadges.completed += 1
      })
      orderBadges.value = nextBadges
    }
  } catch (error) {
    console.error('加载用户统计失败:', error)
  }
}

const formatBadge = (count) => {
  const n = Number(count) || 0
  return n > 99 ? '99+' : String(n)
}

const goToLogin = () => {
  uni.navigateTo({ url: '/pages/login/login' })
}

const handleLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        isLoggedIn.value = false
        user.value = {}
        artworkCount.value = 0
        orderCount.value = 0
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    }
  })
}

const goToOrders = (status) => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  const query = status ? `?status=${status}` : ''
  uni.navigateTo({ url: `/pages/my-orders/my-orders${query}` })
}

const goToMyArtworks = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/my-artworks/my-artworks' })
}

const goToUploadTemplate = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/upload-template/upload-template' })
}

const goToAddress = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/address/address' })
}

const goToCoupons = () => {
  if (!isLoggedIn.value) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/coupons/coupons' })
}

const goToHelp = () => {
  uni.showModal({
    title: '帮助中心',
    content: '常见问题：\n\n1. 如何绘制拼豆？\n点击底部"创作"，选择颜色后在画布上点击或滑动绘制。\n\n2. 如何保存作品？\n绘制完成后点击"保存"，登录后可保存到云端。\n\n3. 如何购买商品？\n浏览商城后加入购物车，在购物车结算。',
    showCancel: false,
    confirmText: '我知道了'
  })
}

const goToAbout = () => {
  uni.showModal({
    title: '关于拼豆 DIY',
    content: '版本：1.0.0\n\n让创意变成现实\n\n功能特性：\n• 在线拼豆创作\n• 模板库\n• 商城购物\n• 作品云端保存\n• 撤销/重做\n• 作品导出',
    showCancel: false
  })
}

onShow(() => {
  checkLogin()
})

const refreshHandler = () => checkLogin()
onAppEvent(APP_EVENTS.ORDER_UPDATED, refreshHandler)
onAppEvent(APP_EVENTS.ARTWORK_UPDATED, refreshHandler)

onUnmounted(() => {
  offAppEvent(APP_EVENTS.ORDER_UPDATED, refreshHandler)
  offAppEvent(APP_EVENTS.ARTWORK_UPDATED, refreshHandler)
})
</script>

<style lang="scss" scoped>
$primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

.user-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 40rpx;
}

.user-card {
  background: $primary-gradient;
  margin: 0 24rpx 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  
  .user-info {
    display: flex;
    align-items: center;
    padding: 50rpx 30rpx 30rpx;
    
    .avatar {
      width: 120rpx;
      height: 120rpx;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 24rpx;
      
      .avatar-icon {
        font-size: 60rpx;
      }
      
      .avatar-img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
      }
    }
    
    .user-details {
      flex: 1;
      
      .nickname {
        display: block;
        font-size: 36rpx;
        color: #fff;
        font-weight: bold;
        margin-bottom: 8rpx;
      }
      
      .user-desc {
        display: block;
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.8);
      }
    }
    
    .logout-btn {
      padding: 12rpx 24rpx;
      font-size: 24rpx;
      color: #fff;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 20rpx;
      border: 1rpx solid rgba(255, 255, 255, 0.3);
      
      &::after {
        border: none;
      }
    }
  }
  
  .user-stats {
    display: flex;
    align-items: center;
    padding: 30rpx;
    background: rgba(255, 255, 255, 0.2);
    
    .stat-item {
      flex: 1;
      text-align: center;
      
      .stat-value {
        display: block;
        font-size: 40rpx;
        color: #fff;
        font-weight: bold;
        margin-bottom: 8rpx;
      }
      
      .stat-label {
        display: block;
        font-size: 24rpx;
        color: rgba(255, 255, 255, 0.8);
      }
    }
    
    .stat-divider {
      width: 1rpx;
      height: 60rpx;
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.order-section {
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 24rpx;
  padding: 30rpx;
  
  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    
    .section-title {
      font-size: 32rpx;
      color: #333;
      font-weight: bold;
    }
    
    .order-more {
      font-size: 24rpx;
      color: #999;
    }
  }
  
  .order-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20rpx;
    
    .order-item {
      text-align: center;
      position: relative;
      
      .order-icon {
        font-size: 48rpx;
        display: block;
        margin-bottom: 12rpx;
      }
      
      .order-name {
        font-size: 24rpx;
        color: #666;
      }

      .order-badge {
        position: absolute;
        top: -10rpx;
        right: 16rpx;
        min-width: 34rpx;
        height: 34rpx;
        line-height: 34rpx;
        padding: 0 8rpx;
        border-radius: 999rpx;
        text-align: center;
        font-size: 20rpx;
        color: #fff;
        background: #ff4d4f;
        box-shadow: 0 6rpx 14rpx rgba(255, 77, 79, 0.35);
      }
    }
  }
}

.menu-section {
  background: #fff;
  margin: 0 24rpx 24rpx;
  border-radius: 24rpx;
  overflow: hidden;
  
  .menu-item {
    display: flex;
    align-items: center;
    padding: 30rpx;
    border-bottom: 1rpx solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .menu-icon {
      font-size: 40rpx;
      margin-right: 24rpx;
    }
    
    .menu-name {
      flex: 1;
      font-size: 28rpx;
      color: #333;
    }
    
    .menu-arrow {
      font-size: 40rpx;
      color: #ccc;
    }
  }
}
</style>
