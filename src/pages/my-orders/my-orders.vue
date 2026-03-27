<template>
  <view class="orders-container">
    <!-- 未登录提示 -->
    <view v-if="!isLoggedIn" class="not-logged-in">
      <text class="tips">请先登录后查看订单</text>
      <button class="login-btn" @click="goToLogin">去登录</button>
    </view>

    <!-- 订单列表 -->
    <view v-else>
      <view class="status-tabs">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="status-tab"
          :class="{ active: currentStatus === tab.key }"
          @click="switchStatus(tab.key)"
        >
          {{ tab.label }}
        </view>
      </view>

      <view v-if="orders.length === 0" class="empty-state">
        <text class="emoji">📦</text>
        <text class="tips">当前状态暂无订单</text>
        <button class="shop-btn" @click="goToShop">去逛逛</button>
      </view>

      <view v-else class="orders-list">
        <view v-for="order in orders" :key="order.id" class="order-item">
          <view class="order-header">
            <text class="order-id">订单号：{{ order.order_no || order.id }}</text>
            <text class="order-status" :class="order.status">{{ getStatusText(order.status) }}</text>
          </view>

          <view class="order-items">
            <view v-for="(item, index) in order.items" :key="index" class="order-item-detail">
              <text class="item-name">{{ item.product_name || item.artwork_title || item.name || '作品' }}</text>
              <text class="item-price">¥{{ formatMoney(item.price) }} × {{ item.quantity || 1 }}</text>
            </view>
          </view>

          <view class="order-footer">
            <text class="order-total">合计：¥{{ formatMoney(order.total_amount ?? order.total) }}</text>
            <text class="order-date">{{ formatDate(order.createdAt) }}</text>
          </view>

          <view class="order-actions">
            <button v-if="order.status === 'pending'" class="ghost-btn" @click="cancelOrder(order.id)">取消订单</button>
            <button v-if="order.status === 'pending'" class="pay-btn" @click="payOrder(order.id)">立即支付</button>
            <button v-if="order.status === 'shipped'" class="pay-btn" @click="confirmReceive(order.id)">确认收货</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { userStore } from '@/stores/user.js'
import { cloudStore } from '@/stores/cloud.js'
import { APP_EVENTS, onAppEvent, offAppEvent, emitAppEvent } from '@/utils/events.js'

export default {
  data() {
    return {
      isLoggedIn: false,
      orders: [],
      currentStatus: '',
      tabs: [
        { key: '', label: '全部' },
        { key: 'pending', label: '待付款' },
        { key: 'paid', label: '待发货' },
        { key: 'shipped', label: '待收货' },
        { key: 'completed', label: '已完成' },
        { key: 'cancelled', label: '已取消' }
      ]
    }
  },

  onLoad(options) {
    this.currentStatus = options?.status || ''
    this.orderEventHandler = () => {
      if (this.isLoggedIn) this.loadOrders()
    }
    onAppEvent(APP_EVENTS.ORDER_UPDATED, this.orderEventHandler)
  },
  onShow() {
    this.checkLogin()
    if (this.isLoggedIn) {
      this.loadOrders()
    }
  },
  onUnload() {
    if (this.orderEventHandler) {
      offAppEvent(APP_EVENTS.ORDER_UPDATED, this.orderEventHandler)
      this.orderEventHandler = null
    }
  },

  methods: {
    checkLogin() {
      this.isLoggedIn = userStore.isLoggedIn
    },

    formatMoney(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return '0.00'
      return n.toFixed(2)
    },

    async loadOrders() {
      const result = await cloudStore.getOrders(this.currentStatus || null)
      if (result.success) {
        const src = Array.isArray(result.orders) ? result.orders : []
        this.orders = src
          .map((order) => ({
            ...order,
            createdAt: order.createdAt || order.created_at || '',
            total_amount: Number(order.total_amount ?? order.total ?? 0) || 0,
            items: Array.isArray(order.items) ? order.items : []
          }))
      }
    },

    getStatusText(status) {
      const statusMap = {
        pending: '待付款',
        paid: '待发货',
        shipped: '待收货',
        completed: '已完成',
        cancelled: '已取消'
      }
      return statusMap[status] || status
    },

    switchStatus(status) {
      this.currentStatus = status
      this.loadOrders()
    },

    formatDate(dateStr) {
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    },

    goToLogin() {
      uni.navigateTo({
        url: '/pages/login/login'
      })
    },

    goToShop() {
      uni.switchTab({
        url: '/pages/shop/shop'
      })
    },

    async payOrder(orderId) {
      uni.showModal({
        title: '确认支付',
        content: '确认支付该订单吗？',
        success: async (res) => {
          if (res.confirm) {
            // 模拟支付
            uni.showLoading({ title: '支付中' })
            
            setTimeout(async () => {
              const result = await cloudStore.payOrder(orderId)
              uni.hideLoading()
              
              if (result.success) {
                uni.showToast({
                  title: '支付成功',
                  icon: 'success'
                })
                emitAppEvent(APP_EVENTS.ORDER_UPDATED, { source: 'my-orders' })
                this.loadOrders()
              } else {
                uni.showToast({
                  title: result.message,
                  icon: 'none'
                })
              }
            }, 1500)
          }
        }
      })
    },

    cancelOrder(orderId) {
      uni.showModal({
        title: '取消订单',
        content: '确认取消该订单吗？',
        success: async (res) => {
          if (!res.confirm) return
          const result = await cloudStore.cancelOrder(orderId)
          if (result.success) {
            uni.showToast({ title: '已取消', icon: 'success' })
            emitAppEvent(APP_EVENTS.ORDER_UPDATED, { source: 'my-orders-cancel' })
            this.loadOrders()
          } else {
            uni.showToast({ title: result.message || '取消失败', icon: 'none' })
          }
        }
      })
    },

    confirmReceive(orderId) {
      uni.showModal({
        title: '确认收货',
        content: '确认已收到货物？',
        success: async (res) => {
          if (!res.confirm) return
          const result = await cloudStore.confirmOrder(orderId)
          if (result.success) {
            uni.showToast({ title: '已确认收货', icon: 'success' })
            emitAppEvent(APP_EVENTS.ORDER_UPDATED, { source: 'my-orders-confirm' })
            this.loadOrders()
          } else {
            uni.showToast({ title: result.message || '确认失败', icon: 'none' })
          }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.orders-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20rpx;
}

.status-tabs {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 14rpx;
  padding: 8rpx;
  margin-bottom: 16rpx;
  overflow-x: auto;
  white-space: nowrap;
}

.status-tab {
  font-size: 24rpx;
  color: #6b7280;
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  margin-right: 8rpx;
  flex-shrink: 0;

  &.active {
    color: #fff;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
}

.not-logged-in {
  text-align: center;
  padding-top: 200rpx;

  .tips {
    display: block;
    font-size: 28rpx;
    color: #666;
    margin-bottom: 40rpx;
  }

  .login-btn {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    padding: 20rpx 60rpx;
    border-radius: 50rpx;
    font-size: 28rpx;
    border: none;
  }
}

.empty-state {
  text-align: center;
  padding-top: 150rpx;

  .emoji {
    font-size: 120rpx;
    display: block;
    margin-bottom: 30rpx;
  }

  .tips {
    display: block;
    font-size: 28rpx;
    color: #999;
    margin-bottom: 40rpx;
  }

  .shop-btn {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    padding: 20rpx 60rpx;
    border-radius: 50rpx;
    font-size: 28rpx;
    border: none;
  }
}

.orders-list {
  .order-item {
    background: #fff;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    padding: 30rpx;
  }

  .order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #eee;

    .order-id {
      font-size: 26rpx;
      color: #666;
    }

    .order-status {
      font-size: 26rpx;
      padding: 8rpx 20rpx;
      border-radius: 20rpx;

      &.pending {
        background: #fff3e0;
        color: #ff9800;
      }

      &.paid, &.shipped, &.completed {
        background: #e8f5e9;
        color: #4caf50;
      }

      &.cancelled {
        background: #ffebee;
        color: #f44336;
      }
    }
  }

  .order-items {
    margin-bottom: 20rpx;

    .order-item-detail {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12rpx;

      .item-name {
        font-size: 28rpx;
        color: #333;
      }

      .item-price {
        font-size: 28rpx;
        color: #667eea;
        font-weight: 500;
      }
    }
  }

  .order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 20rpx;
    border-top: 1rpx solid #eee;

    .order-total {
      font-size: 30rpx;
      color: #333;
      font-weight: bold;
    }

    .order-date {
      font-size: 24rpx;
      color: #999;
    }
  }

  .order-actions {
    margin-top: 20rpx;
    text-align: right;
    display: flex;
    justify-content: flex-end;
    gap: 16rpx;

    .ghost-btn {
      display: inline-block;
      background: #fff;
      color: #666;
      padding: 16rpx 32rpx;
      border-radius: 8rpx;
      font-size: 26rpx;
      border: 1rpx solid #ddd;
    }

    .pay-btn {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      padding: 16rpx 40rpx;
      border-radius: 8rpx;
      font-size: 28rpx;
      border: none;
    }
  }
}
</style>
