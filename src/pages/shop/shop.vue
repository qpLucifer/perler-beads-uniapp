<template>
  <view class="shop-page">
    <view class="filter-section">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-tags">
          <view class="filter-tag" :class="{ active: selectedCategory === '全部' }" @click="selectCategory('全部')">全部</view>
          <view class="filter-tag" :class="{ active: selectedCategory === '拼豆' }" @click="selectCategory('拼豆')">🎨 拼豆</view>
          <view class="filter-tag" :class="{ active: selectedCategory === '底板' }" @click="selectCategory('底板')">⬜ 底板</view>
          <view class="filter-tag" :class="{ active: selectedCategory === '工具' }" @click="selectCategory('工具')">🔧 工具</view>
          <view class="filter-tag" :class="{ active: selectedCategory === '套装' }" @click="selectCategory('套装')">🎁 套装</view>
        </view>
      </scroll-view>
    </view>

    <view class="products-list">
      <view class="product-card" v-for="product in filteredProducts" :key="product.id">
        <view class="product-image">{{ product.emoji }}</view>
        <view class="product-info">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-desc">{{ product.description }}</text>
          <view class="product-meta">
            <text class="product-price">¥{{ product.price.toFixed(2) }}</text>
          </view>
        </view>
        <button class="add-cart-btn" @click="addToCart(product)">🛒</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getProducts, addToCart as apiAddToCart } from '@/api'
import { userStore } from '@/stores/user.js'
import { APP_EVENTS, emitAppEvent } from '@/utils/events.js'

const selectedCategory = ref('全部')
const products = ref([])
const loading = ref(false)

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

// 加载商品数据
const loadProducts = async () => {
  loading.value = true
  try {
    const res = await getProducts()
    if (res.success && res.data.products) {
      products.value = res.data.products.map(p => ({
        id: p.id,
        name: p.name,
        description: decodeHtmlEntities(p.description || ''),
        price: Number(p.price),
        category: p.category,
        emoji: getCategoryEmoji(p.category),
        stock: p.stock
      }))
    }
  } catch (error) {
    console.error('加载商品失败:', error)
    // 使用默认数据
    loadDefaultProducts()
  } finally {
    loading.value = false
  }
}

const getCategoryEmoji = (category) => {
  const map = {
    'set': '🎨',
    'board': '⬜',
    'tool': '🔧',
    'bead': '✨'
  }
  return map[category] || '📦'
}

const loadDefaultProducts = () => {
  products.value = [
    { id: 1, name: '基础拼豆套装', description: '包含 20 种颜色，每种 100 颗', price: 39.9, category: 'set', emoji: '🎨', stock: 50 },
    { id: 2, name: '32x32 透明底板', description: '大号透明底板，适合复杂作品', price: 15.9, category: 'board', emoji: '⬜', stock: 100 },
    { id: 3, name: '专业熨斗', description: '恒温控制，安全易用', price: 45.0, category: 'tool', emoji: '🔧', stock: 30 },
    { id: 4, name: '夜光拼豆', description: '特殊夜光效果，10 色混合', price: 29.9, category: 'bead', emoji: '✨', stock: 8 },
    { id: 5, name: '金属色拼豆', description: '金银铜三色，高级质感', price: 25.9, category: 'bead', emoji: '🌟', stock: 25 },
    { id: 6, name: '迷你底板套装', description: '6 个迷你底板，适合小作品', price: 19.9, category: 'board', emoji: '◻️', stock: 60 }
  ]
}

const filteredProducts = computed(() => {
  if (selectedCategory.value === '全部') {
    return products.value
  }
  const categoryMap = {
    '拼豆': 'bead',
    '底板': 'board',
    '工具': 'tool',
    '套装': 'set'
  }
  const targetCategory = categoryMap[selectedCategory.value] || selectedCategory.value
  return products.value.filter(p => p.category === targetCategory)
})

const selectCategory = (category) => {
  selectedCategory.value = category
  uni.vibrateShort()
}

const addToCart = async (product) => {
  if (!userStore.isLoggedIn) {
    uni.showModal({
      title: '提示',
      content: '请先登录后再加入购物车',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/login/login' })
        }
      }
    })
    return
  }

  try {
    const result = await apiAddToCart({
      product_id: product.id,
      quantity: 1
    })
    
    if (result.success) {
      uni.vibrateShort({ type: 'success' })
      uni.showToast({ title: '已加入购物车', icon: 'success' })
      emitAppEvent(APP_EVENTS.CART_UPDATED, { source: 'shop' })
    } else {
      uni.showToast({ title: result.message || '添加失败', icon: 'none' })
    }
  } catch (error) {
    console.error('添加到购物车失败:', error)
    uni.showToast({ title: '添加失败，请重试', icon: 'none' })
  }
}

onShow(() => {
  loadProducts()
})
</script>

<style lang="scss" scoped>
$primary-color: #667eea;
$secondary-color: #764ba2;

.shop-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 40rpx;
}

.filter-section {
  background: white;
  padding: 24rpx;
  margin-bottom: 20rpx;
  
  .filter-scroll {
    white-space: nowrap;
  }
  
  .filter-tags {
    display: inline-flex;
    gap: 16rpx;
  }
  
  .filter-tag {
    display: inline-flex;
    align-items: center;
    padding: 16rpx 32rpx;
    background: #f8f9fa;
    border-radius: 40rpx;
    font-size: 28rpx;
    color: #666;
    
    &.active {
      background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
      color: white;
    }
  }
}

.products-list {
  padding: 0 24rpx;
  
  .product-card {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    
    .product-image {
      width: 140rpx;
      height: 140rpx;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border-radius: 24rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 80rpx;
      margin-right: 24rpx;
    }
    
    .product-info {
      flex: 1;
      
      .product-name {
        display: block;
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
        margin-bottom: 12rpx;
      }
      
      .product-desc {
        display: block;
        font-size: 26rpx;
        color: #666;
        margin-bottom: 16rpx;
      }
      
      .product-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        
        .product-price {
          font-size: 36rpx;
          font-weight: bold;
          color: $primary-color;
        }
      }
    }
    
    .add-cart-btn {
      width: 70rpx;
      height: 70rpx;
      background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36rpx;
    }
  }
}
</style>
