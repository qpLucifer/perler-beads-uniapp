<template>
  <view class="confirm-page">
    <!-- 收货地址 -->
    <view class="section address-section">
      <view class="section-header">
        <text class="section-title">📍 收货地址</text>
        <text class="section-action" @tap="manageAddress">管理 ▶</text>
      </view>
      
      <view v-if="!selectedAddress" class="no-address" @tap="manageAddress">
        <text class="no-address-icon">🏠</text>
        <text class="no-address-text">请添加收货地址</text>
      </view>
      
      <view v-else class="address-card" @tap="manageAddress">
        <view class="address-row">
          <text class="user-name">{{ selectedAddress.name }}</text>
          <text class="user-phone">{{ selectedAddress.phone }}</text>
        </view>
        <view class="address-detail">
          <text>{{ selectedAddress.province }}{{ selectedAddress.city }}{{ selectedAddress.district }}{{ selectedAddress.detail }}</text>
        </view>
        <view v-if="selectedAddress.is_default" class="default-tag">默认</view>
      </view>
    </view>

    <!-- 商品清单 -->
    <view class="section items-section">
      <view class="section-header">
        <text class="section-title">📦 商品清单</text>
      </view>
      
      <view class="item-list">
        <view v-for="item in cartItems" :key="item.id" class="cart-item">
          <view class="item-image">
            <text class="item-emoji">{{ item.product?.emoji || '🎨' }}</text>
          </view>
          <view class="item-info">
            <text class="item-name">{{ item.product?.name || item.artwork?.name || '作品' }}</text>
            <text class="item-desc">{{ item.product?.description || '自定义作品' }}</text>
            <view class="item-meta">
              <text class="item-price">¥{{ item.price.toFixed(2) }}</text>
              <text class="item-quantity">x{{ item.quantity }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 优惠券 -->
    <view class="section coupon-section">
      <view class="section-header">
        <text class="section-title">🎫 优惠券</text>
        <text class="section-action" @tap="selectCoupon">选择 ▶</text>
      </view>
      
      <view v-if="selectedCoupon" class="coupon-card" @tap="selectCoupon">
        <view class="coupon-info">
          <text class="coupon-name">{{ selectedCoupon.name }}</text>
          <text class="coupon-desc">{{ selectedCoupon.description }}</text>
        </view>
        <view class="coupon-amount">
          <text class="amount-label">减</text>
          <text class="amount-value">¥{{ Number(selectedCoupon.discount_value || 0).toFixed(2) }}</text>
        </view>
      </view>
      
      <view v-else class="no-coupon" @tap="selectCoupon">
        <text>暂无优惠券</text>
      </view>
    </view>

    <!-- 备注 -->
    <view class="section remark-section">
      <view class="section-header">
        <text class="section-title">💬 订单备注</text>
      </view>
      <textarea 
        class="remark-input"
        v-model="remark"
        placeholder="选填：对本订单的说明（如配送时间等）"
        maxlength="200"
      />
    </view>

    <!-- 底部结算栏 -->
    <view class="checkout-bar">
      <view class="price-info">
        <view class="price-row">
          <text>商品总额：</text>
          <text class="price-value">¥{{ goodsTotal.toFixed(2) }}</text>
        </view>
        <view v-if="selectedCoupon" class="price-row discount">
          <text>优惠减免：</text>
          <text class="price-value">-¥{{ Number(selectedCoupon.discount_value || 0).toFixed(2) }}</text>
        </view>
        <view class="price-divider"></view>
        <view class="price-row total">
          <text>实付款：</text>
          <text class="total-price">¥{{ finalTotal.toFixed(2) }}</text>
        </view>
      </view>
      
      <button class="submit-btn" @tap="submitOrder" :disabled="!canSubmit">
        <text v-if="!canSubmit">请选择地址</text>
        <text v-else>提交订单 ¥{{ finalTotal.toFixed(2) }}</text>
      </button>
    </view>

    <!-- 优惠券选择弹窗 -->
    <view v-if="showCouponModal" class="modal-overlay" @tap="showCouponModal = false">
      <view class="coupon-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">选择优惠券</text>
          <text class="modal-close" @tap="showCouponModal = false">✕</text>
        </view>
        
        <scroll-view class="modal-content" scroll-y>
          <view v-if="coupons.length === 0" class="empty-coupons">
            <text class="empty-icon">🎫</text>
            <text class="empty-text">暂无可用优惠券</text>
          </view>
          
          <view v-for="coupon in coupons" :key="coupon.id" 
                class="coupon-option"
                :class="{ selected: selectedCoupon?.id === coupon.id }"
                @tap="chooseCoupon(coupon)">
            <view class="coupon-left">
              <text class="coupon-name">{{ coupon.name }}</text>
              <text class="coupon-desc">{{ coupon.description }}</text>
              <text class="coupon-condition">满{{ coupon.min_amount }}元可用</text>
            </view>
            <view class="coupon-right">
              <text class="amount-label">减</text>
              <text class="amount-value">¥{{ Number(coupon.discount_value || 0).toFixed(2) }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script>
import { userStore } from '@/stores/user.js'
import { cloudStore } from '@/stores/cloud.js'
import { getAddresses, getCart, getMyCoupons } from '@/api'
import { APP_EVENTS, emitAppEvent } from '@/utils/events.js'

export default {
  data() {
    return {
      rawCartItems: [],
      selectedAddress: null,
      selectedCoupon: null,
      remark: '',
      showCouponModal: false,
      coupons: []
    }
  },

  computed: {
    cartItems() {
      return this.rawCartItems.map((item) => {
        const price = this.normalizeLinePrice(item)
        const qty = item.quantity || 1
        if (item.type === 'artwork') {
          return {
            id: item.id,
            quantity: qty,
            price,
            product: {
              name: item.artwork?.name || '我的作品',
              description: `${item.artwork?.width || 32}x${item.artwork?.height || 32} 拼豆作品`,
              emoji: '🎨'
            }
          }
        }
        return {
          id: item.id,
          quantity: qty,
          price,
          product: {
            ...item.product,
            emoji: this.categoryEmoji(item.product?.category),
            description: this.decodeHtmlEntities(item.product?.description || '')
          }
        }
      })
    },
    goodsTotal() {
      const total = this.cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0)
      return this.toMoney(total)
    },
    finalTotal() {
      const discount = this.selectedCoupon ? Number(this.selectedCoupon.discount_value) || 0 : 0
      return this.toMoney(Math.max(0, this.goodsTotal - discount))
    },
    canSubmit() {
      return !!(this.selectedAddress && this.cartItems.length > 0)
    }
  },

  async onLoad() {
    if (!userStore.isLoggedIn) {
      uni.showModal({
        title: '提示',
        content: '请先登录后再结算',
        showCancel: false,
        success: () => uni.navigateTo({ url: '/pages/login/login' })
      })
      return
    }

    await this.loadCartFromServer()

    if (this.rawCartItems.length === 0) {
      uni.showToast({ title: '购物车为空', icon: 'none' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/shop/shop' })
      }, 1500)
      return
    }

    await this.loadAddresses()
    await this.loadCoupons()
  },

  onShow() {
    try {
      const pick = uni.getStorageSync('checkout_pick_address')
      if (pick) {
        this.selectedAddress = JSON.parse(pick)
        uni.removeStorageSync('checkout_pick_address')
      }
    } catch (e) {
      console.error(e)
    }
    if (userStore.isLoggedIn && this.rawCartItems.length > 0) {
      this.loadAddresses()
      this.loadCoupons()
    }
  },

  methods: {
    toMoney(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return 0
      return Math.round(n * 100) / 100
    },

    // Decode backend HTML entities like "&gt;" so they render as real symbols.
    decodeHtmlEntities(value) {
      return String(value || '')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    },

    normalizeLinePrice(item) {
      if (item.type === 'artwork') {
        if (item.artwork?.price != null) {
          const p = Number(item.artwork.price)
          if (Number.isFinite(p)) return p
        }
        const bc = item.artwork?.beadCount ?? item.artwork?.bead_count ?? 0
        const fallback = 23 + Number(bc || 0) * 0.1
        return Number.isFinite(fallback) ? fallback : 23
      }
      const p = Number(item.product?.price)
      return Number.isFinite(p) ? p : 0
    },

    categoryEmoji(category) {
      const map = { set: '🎨', board: '⬜', tool: '🔧', bead: '✨' }
      return map[category] || '📦'
    },

    async loadCartFromServer() {
      try {
        const res = await getCart()
        if (res.success && res.data.cartItems) {
          this.rawCartItems = res.data.cartItems
        } else {
          this.rawCartItems = []
        }
      } catch (error) {
        console.error('加载购物车失败:', error)
        this.rawCartItems = []
      }
    },

    // 加载地址列表
    async loadAddresses() {
      try {
        const res = await getAddresses()
        if (res.success && res.data.addresses) {
          const addresses = res.data.addresses
          const stillValid =
            this.selectedAddress &&
            addresses.some((a) => a.id === this.selectedAddress.id)
          if (!stillValid) {
            this.selectedAddress = addresses.find((a) => a.is_default) || addresses[0] || null
          }
        }
      } catch (error) {
        console.error('加载地址失败:', error)
      }
    },

    // 加载优惠券
    async loadCoupons() {
      try {
        const res = await getMyCoupons('unused')
        if (res.success && res.data.coupons) {
          // Avoid timing issues where computed `goodsTotal` is still 0.
          const total = this.cartItems.reduce(
            (sum, item) => sum + item.price * (item.quantity || 1),
            0
          )

          const nextCoupons = res.data.coupons
            .map(c => ({
              ...c,
              description: this.decodeHtmlEntities(c.description || '')
            }))
            .filter((c) => Number(c.min_amount || 0) <= total)

          this.coupons = nextCoupons

          // If current selected coupon is no longer valid, clear it.
          if (this.selectedCoupon && !nextCoupons.some(c => c.id === this.selectedCoupon.id)) {
            this.selectedCoupon = null
          }
        }
      } catch (error) {
        console.error('加载优惠券失败:', error)
      }
    },

    // 管理地址
    manageAddress() {
      uni.navigateTo({ url: '/pages/address/address' })
    },

    // 选择优惠券
    selectCoupon() {
      this.showCouponModal = true
    },

    // 选择优惠券
    chooseCoupon(coupon) {
      if (this.selectedCoupon?.id === coupon.id) {
        this.selectedCoupon = null
      } else {
        this.selectedCoupon = coupon
      }
      this.showCouponModal = false
    },

    // 提交订单
    async submitOrder() {
      if (!this.canSubmit) return
      
      if (!userStore.isLoggedIn) {
        uni.showModal({
          title: '提示',
          content: '请先登录',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({ url: '/pages/login/login' })
            }
          }
        })
        return
      }

      uni.showLoading({ title: '创建订单中...' })

      try {
        const items = this.rawCartItems.map((item) => {
          const qty = item.quantity || 1
          if (item.type === 'artwork' && item.artwork?.id) {
            return {
              artwork_id: item.artwork.id,
              product_name: item.artwork.name || '自定义作品',
              quantity: qty
            }
          }
          return {
            product_id: item.product?.id,
            product_name: item.product?.name || '',
            quantity: qty
          }
        })

        const orderData = {
          items,
          address_id: this.selectedAddress.id,
          coupon_id: this.selectedCoupon?.id,
          remark: this.remark
        }

        const result = await cloudStore.createOrder(orderData)
        uni.hideLoading()

        if (result.success) {
          emitAppEvent(APP_EVENTS.ORDER_UPDATED, { source: 'confirm' })
          emitAppEvent(APP_EVENTS.CART_UPDATED, { source: 'confirm' })
          const payAmount = this.toMoney(this.finalTotal).toFixed(2)
          // 跳转到支付页面
          uni.navigateTo({
            url: `/pages/pay/pay?orderId=${result.order.id}&amount=${payAmount}`
          })
        } else {
          uni.showToast({ title: result.message || '创建失败', icon: 'none' })
        }
      } catch (error) {
        uni.hideLoading()
        console.error('创建订单失败:', error)
        uni.showToast({ title: '创建失败，请重试', icon: 'none' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
$primary: #667eea;
$secondary: #764ba2;

.confirm-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 200rpx;
}

.section {
  background: #fff;
  margin-bottom: 20rpx;
  padding: 30rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  
  .section-title {
    font-size: 32rpx;
    font-weight: bold;
    color: #333;
  }
  
  .section-action {
    font-size: 26rpx;
    color: #999;
  }
}

/* 地址 */
.address-section {
  .no-address {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60rpx 0;
    
    .no-address-icon {
      font-size: 80rpx;
      margin-bottom: 20rpx;
    }
    
    .no-address-text {
      font-size: 28rpx;
      color: #999;
    }
  }
  
  .address-card {
    position: relative;
    padding: 24rpx;
    background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
    border-radius: 16rpx;
    
    .address-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16rpx;
      
      .user-name {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
      }
      
      .user-phone {
        font-size: 28rpx;
        color: #666;
      }
    }
    
    .address-detail {
      font-size: 26rpx;
      color: #666;
      line-height: 1.6;
    }
    
    .default-tag {
      position: absolute;
      top: 24rpx;
      right: 24rpx;
      background: linear-gradient(135deg, $primary, $secondary);
      color: #fff;
      font-size: 20rpx;
      padding: 6rpx 16rpx;
      border-radius: 20rpx;
    }
  }
}

/* 商品清单 */
.items-section {
  .item-list {
    .cart-item {
      display: flex;
      padding: 24rpx 0;
      border-bottom: 1rpx solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
      }
      
      .item-image {
        width: 120rpx;
        height: 120rpx;
        background: linear-gradient(135deg, $primary, $secondary);
        border-radius: 16rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 24rpx;
        
        .item-emoji {
          font-size: 50rpx;
        }
      }
      
      .item-info {
        flex: 1;
        
        .item-name {
          display: block;
          font-size: 30rpx;
          font-weight: bold;
          color: #333;
          margin-bottom: 12rpx;
        }
        
        .item-desc {
          display: block;
          font-size: 24rpx;
          color: #999;
          margin-bottom: 16rpx;
        }
        
        .item-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .item-price {
            font-size: 32rpx;
            font-weight: bold;
            color: $primary;
          }
          
          .item-quantity {
            font-size: 26rpx;
            color: #999;
            background: #f5f5f5;
            padding: 8rpx 20rpx;
            border-radius: 20rpx;
          }
        }
      }
    }
  }
}

/* 优惠券 */
.coupon-section {
  .coupon-card, .no-coupon {
    padding: 24rpx;
    background: linear-gradient(135deg, #fff9e6 0%, #fff3cc 100%);
    border-radius: 16rpx;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .coupon-info {
      flex: 1;
      
      .coupon-name {
        display: block;
        font-size: 28rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 8rpx;
      }
      
      .coupon-desc {
        font-size: 24rpx;
        color: #666;
      }
    }
    
    .coupon-amount {
      display: flex;
      align-items: baseline;
      
      .amount-label {
        font-size: 24rpx;
        color: #ff6b6b;
      }
      
      .amount-value {
        font-size: 40rpx;
        font-weight: bold;
        color: #ff6b6b;
      }
    }
  }
  
  .no-coupon {
    justify-content: center;
    color: #999;
    font-size: 28rpx;
  }
}

/* 备注 */
.remark-section {
  .remark-input {
    width: 100%;
    min-height: 160rpx;
    padding: 20rpx;
    background: #f8f9fa;
    border-radius: 12rpx;
    font-size: 28rpx;
    color: #333;
    line-height: 1.6;
  }
}

/* 底部结算栏 */
.checkout-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: 24rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  gap: 30rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  
  .price-info {
    flex: 1;
    
    .price-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12rpx;
      margin-bottom: 8rpx;
      font-size: 26rpx;
      color: #666;
      
      &.discount {
        color: #ff6b6b;
      }
      
      &.total {
        margin-top: 12rpx;
        padding-top: 12rpx;
        border-top: 1rpx solid #f0f0f0;
        font-size: 28rpx;
        color: #333;
        
        .total-price {
          font-size: 40rpx;
          font-weight: bold;
          color: $primary;
        }
      }
    }
    
    .price-divider {
      height: 1rpx;
      background: #f0f0f0;
      margin: 12rpx 0;
    }
  }
  
  .submit-btn {
    min-width: 280rpx;
    height: 88rpx;
    background: linear-gradient(135deg, $primary, $secondary);
    color: #fff;
    border-radius: 44rpx;
    font-size: 30rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    
    &:disabled {
      background: #ccc;
      color: #999;
    }
  }
}

/* 优惠券弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  
  .coupon-modal {
    width: 100%;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 30rpx;
      border-bottom: 1rpx solid #f0f0f0;
      
      .modal-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
      }
      
      .modal-close {
        font-size: 40rpx;
        color: #999;
        padding: 10rpx;
      }
    }
    
    .modal-content {
      flex: 1;
      padding: 20rpx 30rpx;
      
      .empty-coupons {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 100rpx 0;
        
        .empty-icon {
          font-size: 100rpx;
          margin-bottom: 20rpx;
        }
        
        .empty-text {
          font-size: 28rpx;
          color: #999;
        }
      }
      
      .coupon-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24rpx;
        margin-bottom: 20rpx;
        background: linear-gradient(135deg, #fff9e6 0%, #fff3cc 100%);
        border-radius: 16rpx;
        border: 3rpx solid transparent;
        
        &.selected {
          border-color: $primary;
          background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%);
        }
        
        .coupon-left {
          flex: 1;
          
          .coupon-name {
            display: block;
            font-size: 28rpx;
            font-weight: bold;
            color: #333;
            margin-bottom: 8rpx;
          }
          
          .coupon-desc {
            display: block;
            font-size: 24rpx;
            color: #666;
            margin-bottom: 8rpx;
          }
          
          .coupon-condition {
            font-size: 22rpx;
            color: #999;
          }
        }
        
        .coupon-right {
          display: flex;
          align-items: baseline;
          
          .amount-label {
            font-size: 24rpx;
            color: #ff6b6b;
          }
          
          .amount-value {
            font-size: 40rpx;
            font-weight: bold;
            color: #ff6b6b;
          }
        }
      }
    }
  }
}
</style>
