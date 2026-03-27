<template>
  <view class="pay-page">
    <view class="pay-container">
      <!-- 订单信息 -->
      <view class="order-info-card">
        <view class="amount-section">
          <text class="amount-label">支付金额</text>
          <text class="amount-value">¥{{ amount }}</text>
        </view>
        
        <view class="order-detail">
          <view class="detail-row">
            <text class="detail-label">订单编号</text>
            <text class="detail-value">{{ orderId }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">创建时间</text>
            <text class="detail-value">{{ createTime }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">商品数量</text>
            <text class="detail-value">{{ itemCount }} 件</text>
          </view>
        </view>
      </view>

      <!-- 支付方式 -->
      <view class="payment-methods">
        <view class="section-title">选择支付方式</view>
        
        <view 
          class="payment-option"
          :class="{ active: paymentMethod === 'wechat' }"
          @tap="paymentMethod = 'wechat'">
          <view class="payment-icon">💚</view>
          <view class="payment-info">
            <text class="payment-name">微信支付</text>
            <text class="payment-desc">推荐使用</text>
          </view>
          <view class="payment-radio" :class="{ checked: paymentMethod === 'wechat' }"></view>
        </view>
        
        <view 
          class="payment-option"
          :class="{ active: paymentMethod === 'alipay' }"
          @tap="paymentMethod = 'alipay'">
          <view class="payment-icon">💙</view>
          <view class="payment-info">
            <text class="payment-name">支付宝支付</text>
            <text class="payment-desc">快捷方便</text>
          </view>
          <view class="payment-radio" :class="{ checked: paymentMethod === 'alipay' }"></view>
        </view>
        
        <view 
          class="payment-option"
          :class="{ active: paymentMethod === 'balance' }"
          @tap="paymentMethod = 'balance'">
          <view class="payment-icon">💰</view>
          <view class="payment-info">
            <text class="payment-name">余额支付</text>
            <text class="payment-desc">账户余额：¥{{ userBalance }}</text>
          </view>
          <view class="payment-radio" :class="{ checked: paymentMethod === 'balance' }"></view>
        </view>
      </view>

      <!-- 支付说明 -->
      <view class="pay-tips">
        <view class="tip-item">
          <text class="tip-icon">🔒</text>
          <text class="tip-text">安全加密支付，请放心</text>
        </view>
        <view class="tip-item">
          <text class="tip-icon">⏰</text>
          <text class="tip-text">订单保留 30 分钟，请及时支付</text>
        </view>
        <view class="tip-item">
          <text class="tip-icon">📞</text>
          <text class="tip-text">遇到问题请联系客服</text>
        </view>
      </view>

      <!-- 提交按钮 -->
      <button class="submit-pay-btn" @tap="confirmPay" :disabled="isPaying">
        <text v-if="isPaying">支付中...</text>
        <text v-else>立即支付 ¥{{ amount }}</text>
      </button>
    </view>

    <!-- 支付结果弹窗 -->
    <view v-if="showResultModal" class="result-overlay">
      <view class="result-modal" :class="paySuccess ? 'success' : 'failed'">
        <view class="result-icon">{{ paySuccess ? '✓' : '✕' }}</view>
        <view class="result-title">{{ paySuccess ? '支付成功' : '支付失败' }}</view>
        <view class="result-desc">{{ paySuccess ? '订单已确认，将尽快发货' : resultMessage }}</view>
        
        <view class="result-actions">
          <button v-if="!paySuccess" class="retry-btn" @tap="retryPay">重新支付</button>
          <button class="view-order-btn" @tap="viewOrder">
            {{ paySuccess ? '查看订单' : '返回订单' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { cloudStore } from '@/stores/cloud.js'
import { getOrder } from '@/api'
import { APP_EVENTS, emitAppEvent } from '@/utils/events.js'

export default {
  data() {
    return {
      orderId: '',
      amount: '0.00',
      createTime: '',
      itemCount: 1,
      paymentMethod: 'wechat', // wechat | alipay | balance
      userBalance: '0.00',
      isPaying: false,
      showResultModal: false,
      paySuccess: false,
      resultMessage: ''
    }
  },

  onLoad(options) {
    if (options.orderId) {
      this.orderId = options.orderId
    }
    if (options.amount) {
      this.amount = this.formatMoney(options.amount)
    }
    
    this.createTime = this.formatTime(new Date())
    this.loadOrderDetail()
  },

  methods: {
    formatMoney(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return '0.00'
      return (Math.round(n * 100) / 100).toFixed(2)
    },

    // 加载订单详情
    async loadOrderDetail() {
      if (!this.orderId) return
      try {
        const res = await getOrder(this.orderId)
        if (res.success && res.data.order?.items) {
          const items = res.data.order.items
          this.itemCount = items.reduce((n, it) => n + (it.quantity || 0), 0) || items.length
        }
      } catch (error) {
        console.error('加载订单详情失败:', error)
      }
    },

    // 格式化时间
    formatTime(date) {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      const h = String(date.getHours()).padStart(2, '0')
      const min = String(date.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${d} ${h}:${min}`
    },

    // 确认支付
    async confirmPay() {
      if (this.isPaying) return
      
      this.isPaying = true
      
      try {
        // 模拟支付流程
        await this.processPayment()
      } catch (error) {
        console.error('支付失败:', error)
        this.showPayResult(false, '支付失败，请稍后重试')
      } finally {
        this.isPaying = false
      }
    },

    // 处理支付
    processPayment() {
      return new Promise((resolve) => {
        // 模拟支付请求
        setTimeout(async () => {
          try {
            // 调用后端支付 API
            const result = await cloudStore.payOrder(this.orderId)
            
            if (result.success) {
              this.showPayResult(true)
            } else {
              this.showPayResult(false, result.message || '支付失败')
            }
          } catch (error) {
            this.showPayResult(false, '网络错误，请重试')
          }
          
          resolve()
        }, 2000)
      })
    },

    // 显示支付结果
    showPayResult(success, message = '') {
      this.paySuccess = success
      this.resultMessage = message
      this.showResultModal = true
      if (success) {
        emitAppEvent(APP_EVENTS.ORDER_UPDATED, { source: 'pay' })
      }
    },

    // 重新支付
    retryPay() {
      this.showResultModal = false
      this.isPaying = false
    },

    // 查看订单
    viewOrder() {
      if (this.paySuccess) {
        uni.navigateTo({ url: '/pages/my-orders/my-orders' })
      } else {
        uni.navigateBack()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
$primary: #667eea;
$secondary: #764ba2;
$success: #52c41a;
$danger: #ff4d4f;

.pay-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f5f7fa 0%, #e8ecf1 100%);
}

.pay-container {
  padding: 30rpx;
}

/* 订单信息卡片 */
.order-info-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.amount-section {
  text-align: center;
  padding-bottom: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 30rpx;
  
  .amount-label {
    display: block;
    font-size: 28rpx;
    color: #999;
    margin-bottom: 16rpx;
  }
  
  .amount-value {
    display: block;
    font-size: 72rpx;
    font-weight: bold;
    color: $primary;
  }
}

.order-detail {
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20rpx 0;
    
    &:not(:last-child) {
      border-bottom: 1rpx solid #f5f5f5;
    }
    
    .detail-label {
      font-size: 28rpx;
      color: #666;
    }
    
    .detail-value {
      font-size: 28rpx;
      color: #333;
      font-weight: 500;
    }
  }
}

/* 支付方式 */
.payment-methods {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  
  .section-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 24rpx;
  }
  
  .payment-option {
    display: flex;
    align-items: center;
    padding: 28rpx 20rpx;
    margin-bottom: 20rpx;
    background: #f8f9fa;
    border-radius: 16rpx;
    border: 3rpx solid transparent;
    transition: all 0.3s ease;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    &.active {
      background: #f0f4ff;
      border-color: $primary;
    }
    
    .payment-icon {
      font-size: 56rpx;
      margin-right: 24rpx;
    }
    
    .payment-info {
      flex: 1;
      
      .payment-name {
        display: block;
        font-size: 30rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 8rpx;
      }
      
      .payment-desc {
        font-size: 24rpx;
        color: #999;
      }
    }
    
    .payment-radio {
      width: 40rpx;
      height: 40rpx;
      border-radius: 50%;
      border: 3rpx solid #ddd;
      
      &.checked {
        border-color: $primary;
        background: $primary;
        position: relative;
        
        &::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 20rpx;
          height: 20rpx;
          background: #fff;
          border-radius: 50%;
        }
      }
    }
  }
}

/* 支付说明 */
.pay-tips {
  background: #fff;
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
  
  .tip-item {
    display: flex;
    align-items: center;
    margin-bottom: 20rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .tip-icon {
      font-size: 36rpx;
      margin-right: 16rpx;
    }
    
    .tip-text {
      font-size: 26rpx;
      color: #666;
    }
  }
}

/* 提交按钮 */
.submit-pay-btn {
  width: 100%;
  height: 100rpx;
  background: linear-gradient(135deg, $primary, $secondary);
  color: #fff;
  border-radius: 50rpx;
  font-size: 36rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(102, 126, 234, 0.4);
  border: none;
  
  &:disabled {
    background: #ccc;
    color: #999;
    box-shadow: none;
  }
}

/* 支付结果弹窗 */
.result-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  
  .result-modal {
    width: 100%;
    background: #fff;
    border-radius: 32rpx;
    padding: 60rpx 40rpx;
    text-align: center;
    
    &.success {
      .result-icon {
        background: linear-gradient(135deg, $success, #73d13d);
      }
      
      .result-title {
        color: $success;
      }
    }
    
    &.failed {
      .result-icon {
        background: linear-gradient(135deg, $danger, #ff7875);
      }
      
      .result-title {
        color: $danger;
      }
    }
    
    .result-icon {
      width: 120rpx;
      height: 120rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 30rpx;
      font-size: 64rpx;
      color: #fff;
      font-weight: bold;
    }
    
    .result-title {
      font-size: 40rpx;
      font-weight: bold;
      margin-bottom: 16rpx;
    }
    
    .result-desc {
      font-size: 28rpx;
      color: #999;
      margin-bottom: 40rpx;
    }
    
    .result-actions {
      display: flex;
      flex-direction: column;
      gap: 20rpx;
      
      button {
        width: 100%;
        height: 88rpx;
        border-radius: 44rpx;
        font-size: 30rpx;
        font-weight: bold;
        border: none;
      }
      
      .retry-btn {
        background: linear-gradient(135deg, $primary, $secondary);
        color: #fff;
      }
      
      .view-order-btn {
        background: #f5f5f5;
        color: #333;
      }
    }
  }
}
</style>
