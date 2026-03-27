<template>
  <view class="cart-page">
    <view v-if="!isLoggedIn" class="not-logged-in">
      <text class="tips">请先登录后查看购物车</text>
      <button class="login-btn" @tap="goToLogin">去登录</button>
    </view>

    <view v-else>
      <view v-if="loading" class="loading-state">
        <text class="loading-icon">⏳</text>
        <text class="loading-text">加载中...</text>
      </view>

      <view v-else-if="cartItems.length === 0" class="empty-cart">
        <text class="empty-icon">🛒</text>
        <text class="empty-title">购物车空空如也</text>
        <text class="empty-desc">快去挑选心仪的商品吧</text>
        <button class="go-shop-btn" @tap="goToShop">去购物 →</button>
      </view>
    
      <view v-else class="cart-content">
        <scroll-view class="cart-scroll" scroll-y>
          <view class="cart-items">
            <view class="cart-item" v-for="item in cartItems" :key="item.id">
              <view class="item-image">
                <text class="item-emoji">{{ getItemEmoji(item) }}</text>
              </view>
              <view class="item-info">
                <text class="item-name">{{ getItemName(item) }}</text>
                <text class="item-desc">{{ getItemDesc(item) }}</text>
                <view class="item-meta">
                  <text class="item-price">¥{{ getItemPrice(item).toFixed(2) }}</text>
                  
                  <!-- 数量控制器 -->
                  <view class="quantity-control">
                    <view 
                      class="qty-btn" 
                      :class="{ disabled: item.quantity <= 1 }"
                      @tap="decreaseQuantity(item)">－</view>
                    <text class="qty-value">{{ item.quantity }}</text>
                    <view 
                      class="qty-btn add"
                      @tap="increaseQuantity(item)">＋</view>
                  </view>
                </view>
              </view>
              <view class="item-actions">
                <button class="delete-btn" @tap="removeItem(item)">🗑️</button>
              </view>
            </view>
          </view>
        </scroll-view>

        <!-- 底部结算栏 -->
        <view class="cart-summary">
          <view class="summary-left">
            <text>合计:</text>
            <text class="total-price">¥{{ cartTotal.toFixed(2) }}</text>
          </view>
          <view class="summary-right">
            <text class="selected-info">已选 {{ selectedCount }} 件</text>
            <button class="checkout-btn" @tap="checkout">去结算</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { userStore } from '@/stores/user.js'
import { getCart, updateCartItem, removeFromCart } from '@/api'
import { APP_EVENTS, emitAppEvent, onAppEvent, offAppEvent } from '@/utils/events.js'

export default {
  data() {
    return {
      isLoggedIn: false,
      loading: false,
      cartItems: []
    }
  },

  computed: {
    cartTotal() {
      return this.cartItems.reduce((sum, item) => {
        const price = this.getItemPrice(item)
        return sum + price * item.quantity
      }, 0)
    },
    selectedCount() {
      return this.cartItems.reduce((sum, item) => sum + item.quantity, 0)
    }
  },

  onShow() {
    this.checkLogin()
    if (this.isLoggedIn) {
      this.loadCart()
    }
  },
  onLoad() {
    this.handleCartChanged = () => {
      if (this.isLoggedIn) this.loadCart()
    }
    onAppEvent(APP_EVENTS.CART_UPDATED, this.handleCartChanged)
  },
  onUnload() {
    if (this.handleCartChanged) {
      offAppEvent(APP_EVENTS.CART_UPDATED, this.handleCartChanged)
      this.handleCartChanged = null
    }
  },

  methods: {
    checkLogin() {
      this.isLoggedIn = userStore.isLoggedIn
    },

    decodeHtmlEntities(value) {
      return String(value || '')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    },

    async loadCart() {
      this.loading = true
      try {
        const res = await getCart()
        
        if (res.success && res.data.cartItems) {
          this.cartItems = res.data.cartItems
        } else {
          this.cartItems = []
        }
      } catch (error) {
        console.error('加载购物车失败:', error)
        this.cartItems = []
      } finally {
        this.loading = false
      }
    },

    getItemEmoji(item) {
      if (item.type === 'artwork') {
        return '🎨'
      }
      const emojiMap = {
        'set': '🎨',
        'board': '⬜',
        'tool': '🔧',
        'bead': '✨'
      }
      return emojiMap[item.product?.category] || '📦'
    },

    getItemName(item) {
      return item.artwork?.name || item.product?.name || '商品'
    },

    getItemDesc(item) {
      if (item.type === 'artwork') {
        return `${item.artwork?.width || 32}x${item.artwork?.height || 32} 拼豆作品`
      }
      return this.decodeHtmlEntities(item.product?.description || '')
    },

    getItemPrice(item) {
      if (item.type === 'artwork') {
        return item.artwork?.price || 23.00
      }
      return item.product?.price || 0
    },

    // 增加数量
    async increaseQuantity(item) {
      try {
        const result = await updateCartItem(item.id, item.quantity + 1)
        
        if (result.success) {
          item.quantity += 1
          this.saveCartLocal()
          emitAppEvent(APP_EVENTS.CART_UPDATED, { source: 'cart' })
        }
      } catch (error) {
        console.error('更新数量失败:', error)
        uni.showToast({ title: error.message || '更新失败', icon: 'none' })
      }
    },

    // 减少数量
    async decreaseQuantity(item) {
      if (item.quantity <= 1) return
      
      try {
        const result = await updateCartItem(item.id, item.quantity - 1)
        
        if (result.success) {
          item.quantity -= 1
          this.saveCartLocal()
          emitAppEvent(APP_EVENTS.CART_UPDATED, { source: 'cart' })
        }
      } catch (error) {
        console.error('更新数量失败:', error)
        uni.showToast({ title: error.message || '更新失败', icon: 'none' })
      }
    },

    // 删除商品
    removeItem(item) {
      uni.showModal({
        title: '删除商品',
        content: '确定要删除吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await removeFromCart(item.id)
              
              if (result.success) {
                this.cartItems = this.cartItems.filter(i => i.id !== item.id)
                this.saveCartLocal()
                emitAppEvent(APP_EVENTS.CART_UPDATED, { source: 'cart' })
                uni.showToast({ title: '已删除', icon: 'success' })
              }
            } catch (error) {
              console.error('删除失败:', error)
              uni.showToast({ title: error.message || '删除失败', icon: 'none' })
            }
          }
        }
      })
    },

    // 保存到本地缓存（用于快速加载）
    saveCartLocal() {
      uni.setStorageSync('cart_items', JSON.stringify(this.cartItems))
    },

    // 去购物
    goToLogin() {
      uni.navigateTo({ url: '/pages/login/login' })
    },

    goToShop() {
      uni.navigateTo({ url: '/pages/shop/shop' })
    },

    // 结算
    checkout() {
      if (this.cartItems.length === 0) {
        uni.showToast({ title: '请选择商品', icon: 'none' })
        return
      }
      
      // 跳转到订单确认页
      uni.navigateTo({
        url: '/pages/order/confirm'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
$primary-color: #667eea;
$secondary-color: #764ba2;

.cart-page {
  min-height: 100vh;
  background: #f8f9fa;
}

.not-logged-in, .loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 150rpx 60rpx;
  text-align: center;
  
  .loading-icon, .empty-icon {
    font-size: 120rpx;
    margin-bottom: 40rpx;
  }
  
  .loading-text, .empty-title {
    font-size: 36rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 20rpx;
  }
  
  .empty-desc {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 60rpx;
  }
  
  .login-btn, .go-shop-btn {
    padding: 28rpx 80rpx;
    background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
    color: white;
    border-radius: 50rpx;
    font-size: 32rpx;
    font-weight: bold;
    border: none;
  }
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 150rpx 60rpx;
  text-align: center;
}

.cart-content {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.cart-scroll {
  flex: 1;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.cart-items {
  .cart-item {
    display: flex;
    align-items: flex-start;
    background: white;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    position: relative;
    
    .item-image {
      width: 140rpx;
      height: 140rpx;
      background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
      border-radius: 20rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 24rpx;
      flex-shrink: 0;
      
      .item-emoji {
        font-size: 60rpx;
      }
    }
    
    .item-info {
      flex: 1;
      min-width: 0;
      
      .item-name {
        display: block;
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 12rpx;
      }
      
      .item-desc {
        display: block;
        font-size: 26rpx;
        color: #999;
        margin-bottom: 16rpx;
      }
      
      .item-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .item-price {
          font-size: 36rpx;
          font-weight: bold;
          color: $primary-color;
        }
        
        .quantity-control {
          display: flex;
          align-items: center;
          gap: 16rpx;
          
          .qty-btn {
            width: 56rpx;
            height: 56rpx;
            background: #f5f5f5;
            border-radius: 12rpx;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32rpx;
            color: #666;
            
            &.disabled {
              opacity: 0.4;
            }
            
            &.add {
              background: linear-gradient(135deg, $primary-color, $secondary-color);
              color: white;
            }
          }
          
          .qty-value {
            font-size: 32rpx;
            font-weight: bold;
            color: #333;
            min-width: 60rpx;
            text-align: center;
          }
        }
      }
    }
    
    .item-actions {
      .delete-btn {
        width: 60rpx;
        height: 60rpx;
        background: #fff3e0;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32rpx;
        border: none;
        padding: 0;
        margin: 0;
        line-height: 1;
      }
    }
  }
}

/* 底部结算栏 */
.cart-summary {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 24rpx 30rpx;
  border-top: 1rpx solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  
  .summary-left {
    display: flex;
    align-items: baseline;
    gap: 12rpx;
    
    text {
      font-size: 28rpx;
      color: #666;
    }
    
    .total-price {
      font-size: 44rpx;
      font-weight: bold;
      color: $primary-color;
    }
  }
  
  .summary-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8rpx;
    
    .selected-info {
      font-size: 24rpx;
      color: #999;
    }
    
    .checkout-btn {
      padding: 24rpx 60rpx;
      background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
      color: white;
      border-radius: 40rpx;
      font-size: 30rpx;
      font-weight: bold;
      border: none;
    }
  }
}
</style>
