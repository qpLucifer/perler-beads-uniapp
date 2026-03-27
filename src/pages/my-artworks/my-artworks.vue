<template>
  <view class="artworks-container">
    <!-- 未登录提示 -->
    <view v-if="!isLoggedIn" class="not-logged-in">
      <text class="tips">请先登录后查看作品</text>
      <button class="login-btn" @click="goToLogin">去登录</button>
    </view>

    <!-- 作品列表 -->
    <view v-else>
      <view class="overview-card" v-if="artworks.length > 0">
        <view class="overview-item">
          <text class="overview-label">作品总数</text>
          <text class="overview-value">{{ artworks.length }}</text>
        </view>
        <view class="overview-item">
          <text class="overview-label">已加购</text>
          <text class="overview-value">{{ cartItemIds.length }}</text>
        </view>
        <view class="overview-item">
          <text class="overview-label">豆子总数</text>
          <text class="overview-value">{{ totalBeads }}</text>
        </view>
      </view>

      <view class="toolbar" v-if="artworks.length > 0">
        <input
          class="search-input"
          v-model="searchKeyword"
          type="text"
          placeholder="搜索作品名称"
        />
        <view class="top-actions">
          <view class="mode-btn" :class="{ active: batchMode }" @tap="toggleBatchMode">
            {{ batchMode ? '取消批量' : '批量管理' }}
          </view>
        </view>
        <view class="sort-tabs">
          <view class="sort-tab" :class="{ active: sortType === 'latest' }" @tap="sortType = 'latest'">最新</view>
          <view class="sort-tab" :class="{ active: sortType === 'beads' }" @tap="sortType = 'beads'">豆子数</view>
          <view class="sort-tab" :class="{ active: sortType === 'price' }" @tap="sortType = 'price'">价格</view>
        </view>
      </view>

      <view v-if="artworks.length === 0" class="empty-state">
        <text class="emoji">🎨</text>
        <text class="tips">还没有作品</text>
        <text class="desc">开始你的第一次创作吧</text>
        <button class="create-btn" @click="goToEditor">去创作</button>
      </view>

      <view v-else-if="filteredArtworks.length === 0" class="empty-state search-empty">
        <text class="emoji">🔍</text>
        <text class="tips">没有匹配的作品</text>
      </view>

      <view v-else class="artworks-list">
        <view 
          v-for="artwork in filteredArtworks" 
          :key="artwork.id" 
          class="artwork-item"
          @click="viewArtwork(artwork)"
        >
          <view v-if="batchMode" class="select-dot" :class="{ checked: selectedIds.includes(artwork.id) }" @click.stop="toggleSelect(artwork.id)">
            <text v-if="selectedIds.includes(artwork.id)">✓</text>
          </view>
          <view class="artwork-header">
            <view class="artwork-preview">
              <view 
                class="preview-grid" 
                :style="{ gridTemplateColumns: `repeat(${artwork.canvasSize?.width || 32}, 1fr)` }"
              >
                <view 
                  v-for="(bead, index) in getFlattenedCanvas(artwork)" 
                  :key="index"
                  class="preview-bead"
                  :style="{ backgroundColor: bead || 'transparent' }"
                />
              </view>
            </view>
            
            <view v-if="isInCart(artwork.id)" class="cart-badge">
              <text>🛒 已加入</text>
            </view>
          </view>

          <view class="artwork-body">
            <text class="artwork-name">{{ artwork.name || '未命名作品' }}</text>
            <view class="artwork-meta">
              <text class="artwork-beads">🔵 {{ artwork.beadCount || 0 }} 颗</text>
              <text class="artwork-price">💰 ¥{{ artwork.price?.toFixed(2) || '23.00' }}</text>
            </view>
            <view class="artwork-footer">
              <text class="artwork-date">{{ formatDate(artwork.createdAt) }}</text>
              <text v-if="artwork.isPublic" class="public-badge">公开</text>
              <text v-else class="private-badge">私密</text>
            </view>
          </view>

          <view class="artwork-actions">
            <button v-if="!isInCart(artwork.id)" class="action-btn add-cart" @click.stop="addToCart(artwork)">
              <text>🛒 加入</text>
            </button>
            <button class="action-btn edit" @click.stop="editArtwork(artwork)">
              <text>✏️ 编辑</text>
            </button>
            <button class="action-btn delete" @click.stop="deleteArtwork(artwork.id)">
              <text>🗑️ 删除</text>
            </button>
          </view>
        </view>
      </view>

      <view v-if="batchMode && selectedIds.length > 0" class="batch-bar">
        <text class="batch-info">已选 {{ selectedIds.length }} 项</text>
        <button class="batch-del-btn" @tap="deleteSelected">删除选中</button>
      </view>

      <view v-if="previewVisible && previewArtwork" class="preview-mask" @tap="closePreview">
        <view class="preview-panel" @tap.stop>
          <text class="preview-title">{{ previewArtwork.name }}</text>
          <view class="preview-canvas" :style="{ gridTemplateColumns: `repeat(${previewArtwork.canvasSize?.width || 32}, 1fr)` }">
            <view
              v-for="(bead, i) in getFlattenedCanvas(previewArtwork)"
              :key="`p-${i}`"
              class="preview-cell"
              :style="{ backgroundColor: bead || '#fff' }"
            />
          </view>
          <view class="preview-meta">
            <text>豆子 {{ previewArtwork.beadCount || 0 }}</text>
            <text>价格 ¥{{ previewArtwork.price?.toFixed(2) || '23.00' }}</text>
          </view>
          <view class="preview-actions">
            <button class="p-btn light" @tap="editArtwork(previewArtwork)">编辑</button>
            <button class="p-btn light" v-if="!isInCart(previewArtwork.id)" @tap="addToCart(previewArtwork)">加入购物车</button>
            <button class="p-btn danger" @tap="deleteArtwork(previewArtwork.id)">删除</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { userStore } from '@/stores/user.js'
import { cloudStore } from '@/stores/cloud.js'
import { getCart, addToCart as apiAddToCart } from '@/api'
import { APP_EVENTS, emitAppEvent } from '@/utils/events.js'

export default {
  data() {
    return {
      isLoggedIn: false,
      artworks: [],
      cartItems: [],
      cartItemIds: [],
      searchKeyword: '',
      sortType: 'latest',
      batchMode: false,
      selectedIds: [],
      previewVisible: false,
      previewArtwork: null
    }
  },
  computed: {
    totalBeads() {
      return this.artworks.reduce((sum, item) => sum + (item.beadCount || 0), 0)
    },
    filteredArtworks() {
      let list = this.artworks
      const kw = (this.searchKeyword || '').trim().toLowerCase()
      if (kw) {
        list = list.filter(item => (item.name || '').toLowerCase().includes(kw))
      }

      if (this.sortType === 'beads') {
        list = [...list].sort((a, b) => (b.beadCount || 0) - (a.beadCount || 0))
      } else if (this.sortType === 'price') {
        list = [...list].sort((a, b) => (b.price || 0) - (a.price || 0))
      } else {
        list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      }
      return list
    }
  },

  onShow() {
    this.checkLogin()
    if (this.isLoggedIn) {
      this.loadArtworks()
      this.loadCartItems()
    }
  },

  methods: {
    checkLogin() {
      this.isLoggedIn = userStore.isLoggedIn
    },

    async loadArtworks() {
      const result = await cloudStore.getArtworks()
      if (result.success && result.artworks) {
        // 处理后端返回的数据格式
        this.artworks = result.artworks.map(artwork => ({
          id: artwork.id,
          name: artwork.title || '未命名作品',
          canvasSize: {
            width: artwork.width || 32,
            height: artwork.height || 32
          },
          canvasData: this.parseBeadData(artwork.bead_data, artwork.width || 32, artwork.height || 32),
          beadCount: artwork.bead_count || 0,
          price: 23.00 + (artwork.bead_count || 0) * 0.1,
          isPublic: artwork.is_public,
          createdAt: artwork.created_at,
          username: artwork.username || artwork.nickname
        })).reverse()
      }
    },

    parseBeadData(beadData, width, height) {
      // 初始化二维数组
      const canvas = []
      for (let y = 0; y < height; y++) {
        canvas[y] = []
        for (let x = 0; x < width; x++) {
          canvas[y][x] = null
        }
      }
      
      // 解析 bead_data（可能是对象或字符串）
      let data = beadData
      if (typeof beadData === 'string') {
        try {
          data = JSON.parse(beadData)
        } catch (e) {
          console.error('解析 bead_data 失败:', e)
          return canvas
        }
      }
      
      // 兼容二维数组格式（编辑器直接保存）
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const mapped = []
        for (let y = 0; y < height; y++) {
          const row = []
          for (let x = 0; x < width; x++) {
            const cell = data[y] && data[y][x] ? data[y][x] : null
            if (!cell) {
              row.push(null)
            } else {
              row.push({
                id: cell.id || cell.name || 'custom',
                name: cell.name || '颜色',
                hex: cell.hex || '#000000'
              })
            }
          }
          mapped.push(row)
        }
        return mapped
      }

      // 从 cells 数组填充画布
      if (data && data.cells && Array.isArray(data.cells)) {
        data.cells.forEach(cell => {
          if (cell.row >= 0 && cell.row < height && cell.col >= 0 && cell.col < width) {
            // 根据颜色 ID 获取颜色
            const colorMap = {
              '白色': '#FFFFFF',
              '黑色': '#000000',
              '红色': '#FF0000',
              '橙色': '#FFA500',
              '黄色': '#FFFF00',
              '绿色': '#00FF00',
              '蓝色': '#0000FF',
              '紫色': '#8000FF',
              '粉色': '#FFC0CB',
              '棕色': '#8B4513',
              '灰色': '#808080',
              '青色': '#00FFFF'
            }
            const hex = colorMap[cell.color] || '#000000'
            
            canvas[cell.row][cell.col] = {
              id: cell.color,
              name: cell.color,
              hex: hex
            }
          }
        })
      }
      
      return canvas
    },

    async loadCartItems() {
      try {
        const res = await getCart()
        
        if (res.success && res.data.cartItems) {
          // 从 DB 提取购物车中的作品 ID
          this.cartItemIds = res.data.cartItems
            .filter(item => item.type === 'artwork' && item.artwork?.id)
            .map(item => item.artwork.id)
        }
      } catch (error) {
        console.error('加载购物车失败:', error)
        this.cartItemIds = []
      }
    },

    isInCart(artworkId) {
      return this.cartItemIds.includes(artworkId)
    },

    getFlattenedCanvas(artwork) {
      const flat = []
      if (artwork.canvasData) {
        artwork.canvasData.forEach(row => {
          row.forEach(bead => {
            flat.push(bead ? bead.hex : null)
          })
        })
      }
      return flat
    },

    formatDate(dateStr) {
      const date = new Date(dateStr)
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    },

    async addToCart(artwork) {
      if (!this.isInCart(artwork.id)) {
        try {
          const result = await apiAddToCart({
            artwork_id: artwork.id,
            quantity: 1
          })
          
          if (result.success) {
            // 重新从 DB 加载购物车状态
            await this.loadCartItems()
            emitAppEvent(APP_EVENTS.CART_UPDATED, { source: 'my-artworks' })
            
            uni.vibrateShort({ type: 'success' })
            uni.showToast({ title: '已加入购物车', icon: 'success' })
          }
        } catch (error) {
          console.error('添加到购物车失败:', error)
          uni.showToast({ title: '添加失败，请重试', icon: 'none' })
        }
      }
    },

    goToLogin() {
      uni.navigateTo({
        url: '/pages/login/login'
      })
    },

    goToEditor() {
      uni.switchTab({
        url: '/pages/editor/editor'
      })
    },

    viewArtwork(artwork) {
      if (this.batchMode) {
        this.toggleSelect(artwork.id)
        return
      }
      this.previewArtwork = artwork
      this.previewVisible = true
    },

    closePreview() {
      this.previewVisible = false
      this.previewArtwork = null
    },

    toggleBatchMode() {
      this.batchMode = !this.batchMode
      if (!this.batchMode) {
        this.selectedIds = []
      }
    },

    toggleSelect(id) {
      const idx = this.selectedIds.indexOf(id)
      if (idx >= 0) {
        this.selectedIds.splice(idx, 1)
      } else {
        this.selectedIds.push(id)
      }
    },

    async deleteSelected() {
      if (this.selectedIds.length === 0) return
      uni.showModal({
        title: '批量删除',
        content: `确认删除已选 ${this.selectedIds.length} 个作品吗？`,
        success: async (res) => {
          if (!res.confirm) return
          uni.showLoading({ title: '删除中...' })
          try {
            for (const id of this.selectedIds) {
              await cloudStore.deleteArtwork(id)
            }
            uni.hideLoading()
            uni.showToast({ title: '删除成功', icon: 'success' })
            this.batchMode = false
            this.selectedIds = []
            this.loadArtworks()
          } catch (e) {
            uni.hideLoading()
            uni.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      })
    },

    editArtwork(artwork) {
      const payload = {
        name: artwork.name,
        canvasSize: artwork.canvasSize || { width: 32, height: 32 },
        canvasData: artwork.canvasData || []
      }
      uni.setStorageSync('using_template', JSON.stringify(payload))
      uni.switchTab({ url: '/pages/editor/editor' })
    },

    async deleteArtwork(id) {
      uni.showModal({
        title: '确认删除',
        content: '确定要删除这个作品吗？',
        success: async (res) => {
          if (res.confirm) {
            const result = await cloudStore.deleteArtwork(id)
            if (result.success) {
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              })
            emitAppEvent(APP_EVENTS.ARTWORK_UPDATED, { source: 'my-artworks' })
              this.loadArtworks()
              this.closePreview()
            } else {
              uni.showToast({
                title: result.message,
                icon: 'none'
              })
            }
          }
        }
      })
    },

    // 分享作品
    shareArtwork(artwork) {
      uni.showActionSheet({
        itemList: ['分享给好友', '导出图片'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 分享给微信好友
            this.shareToWechat(artwork)
          } else if (res.tapIndex === 1) {
            // 导出图片（简化版：复制链接）
            const dataStr = JSON.stringify({
              name: artwork.name,
              canvasData: artwork.canvasData,
              beadCount: artwork.beadCount
            })
            uni.setClipboardData({
              data: dataStr,
              success: () => {
                uni.showToast({
                  title: '已复制到剪贴板',
                  icon: 'success'
                })
              }
            })
          }
        }
      })
    },

    // 分享到微信
    shareToWechat(artwork) {
      // 设置分享数据
      uni.showShareMenu({
        withShareTicket: true,
        showShareItems: ['wechatFriends', 'wechatMoment']
      })

      // 提示用户点击右上角分享
      uni.showModal({
        title: '分享作品',
        content: `点击右上角 "..." 将作品"${artwork.name}"分享给好友`,
        confirmText: '我知道了',
        showCancel: false,
        success: () => {
          // 可以将画布数据通过 URL 参数传递
          const templateData = encodeURIComponent(JSON.stringify({
            canvasData: artwork.canvasData,
            canvasSize: artwork.canvasSize,
            name: artwork.name
          }))
          
          // 保存到临时存储，供分享后使用
          uni.setStorageSync('shared_template', templateData)
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.artworks-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20rpx;
  padding-bottom: 30rpx;
}

.overview-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;

  .overview-item {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 16rpx;
    padding: 18rpx 10rpx;
    text-align: center;
  }
  .overview-label {
    display: block;
    color: rgba(255, 255, 255, 0.8);
    font-size: 22rpx;
    margin-bottom: 8rpx;
  }
  .overview-value {
    display: block;
    color: #fff;
    font-size: 34rpx;
    font-weight: 700;
  }
}

.toolbar {
  background: #fff;
  border-radius: 18rpx;
  padding: 16rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 18rpx rgba(0, 0, 0, 0.05);

  .search-input {
    height: 72rpx;
    background: #f5f7fb;
    border-radius: 12rpx;
    padding: 0 20rpx;
    font-size: 26rpx;
    margin-bottom: 14rpx;
  }

  .sort-tabs {
    display: flex;
    gap: 12rpx;
  }
  .sort-tab {
    flex: 1;
    text-align: center;
    padding: 12rpx;
    font-size: 24rpx;
    color: #666;
    background: #f3f4f8;
    border-radius: 12rpx;
  }
  .sort-tab.active {
    color: #fff;
    background: linear-gradient(135deg, #667eea, #764ba2);
  }

  .top-actions {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12rpx;
  }
  .mode-btn {
    padding: 8rpx 18rpx;
    font-size: 22rpx;
    border-radius: 20rpx;
    color: #667eea;
    background: #eef2ff;
  }
  .mode-btn.active {
    color: #fff;
    background: #ff7a7a;
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

  .create-btn {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    padding: 20rpx 60rpx;
    border-radius: 50rpx;
    font-size: 28rpx;
    border: none;
  }
}

.search-empty {
  padding-top: 80rpx;
}

.artworks-list {
  .artwork-item {
    position: relative;
    background: #fff;
    border-radius: 20rpx;
    margin-bottom: 24rpx;
    padding: 0;
    overflow: hidden;
    box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
  }

  .select-dot {
    position: absolute;
    top: 18rpx;
    left: 18rpx;
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    border: 2rpx solid #ccd3ea;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: #fff;
    z-index: 3;
  }
  .select-dot.checked {
    border-color: #667eea;
    background: #667eea;
  }

  .artwork-header {
    position: relative;
    display: flex;
    align-items: center;
    background: linear-gradient(135deg, #f8f9ff 0%, #f0f2ff 100%);
    padding: 24rpx;
  }

  .artwork-preview {
    width: 200rpx;
    height: 200rpx;
    background: #fff;
    border-radius: 16rpx;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);

    .preview-grid {
      display: grid;
      width: 100%;
      height: 100%;
      border: 1rpx solid #f0f0f0;
      background: #fff;
    }

    .preview-bead {
      aspect-ratio: 1;
      min-width: 0;
      min-height: 0;
    }
  }

  .cart-badge {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    background: linear-gradient(135deg, #52c41a, #73d13d);
    color: #fff;
    padding: 8rpx 20rpx;
    border-radius: 20rpx;
    font-size: 24rpx;
    font-weight: 500;
    box-shadow: 0 4rpx 12rpx rgba(82, 196, 26, 0.3);
  }

  .artwork-body {
    padding: 24rpx;
  }

  .artwork-name {
    display: block;
    font-size: 32rpx;
    color: #333;
    font-weight: 600;
    margin-bottom: 16rpx;
  }

  .artwork-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;

    .artwork-beads {
      font-size: 26rpx;
      color: #667eea;
    }

    .artwork-price {
      font-size: 28rpx;
      color: #ff6b6b;
      font-weight: 600;
    }
  }

  .artwork-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16rpx;
    border-top: 1rpx solid #f0f0f0;

    .artwork-date {
      font-size: 24rpx;
      color: #999;
    }

    .public-badge {
      background: #e8f5e9;
      color: #4caf50;
      padding: 6rpx 16rpx;
      border-radius: 12rpx;
      font-size: 22rpx;
    }

    .private-badge {
      background: #fff3e0;
      color: #ff9800;
      padding: 6rpx 16rpx;
      border-radius: 12rpx;
      font-size: 22rpx;
    }
  }

  .artwork-actions {
    display: flex;
    gap: 16rpx;
    padding: 0 24rpx 24rpx;

    .action-btn {
      flex: 1;
      height: 72rpx;
      border-radius: 12rpx;
      font-size: 26rpx;
      font-weight: 500;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;

      &.add-cart {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: #fff;
      }

      &.edit {
        background: #f0f4ff;
        color: #667eea;
      }

      &.delete {
        background: #fff3e0;
        color: #ff6b6b;
      }
    }
  }
}

.batch-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1rpx solid #eceff7;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 30;

  .batch-info {
    color: #666;
    font-size: 26rpx;
  }
  .batch-del-btn {
    background: #ff6b6b;
    color: #fff;
    border: none;
    border-radius: 28rpx;
    font-size: 24rpx;
    padding: 0 24rpx;
    height: 56rpx;
    line-height: 56rpx;
  }
}

.preview-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 60;
}

.preview-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}

.preview-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #222;
  display: block;
  margin-bottom: 16rpx;
}

.preview-canvas {
  width: 100%;
  max-height: 420rpx;
  aspect-ratio: 1/1;
  display: grid;
  border: 1rpx solid #eceff7;
  border-radius: 10rpx;
  overflow: hidden;
  margin-bottom: 14rpx;
}

.preview-cell {
  min-width: 0;
  min-height: 0;
  border: 1rpx solid #f2f3f8;
}

.preview-meta {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 24rpx;
  margin-bottom: 18rpx;
}

.preview-actions {
  display: flex;
  gap: 12rpx;
}

.p-btn {
  flex: 1;
  border: none;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
}

.p-btn.light {
  background: #eef2ff;
  color: #5567d8;
}

.p-btn.danger {
  background: #ff6b6b;
  color: #fff;
}
</style>
