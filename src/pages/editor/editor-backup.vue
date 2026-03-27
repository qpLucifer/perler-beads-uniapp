<template>
  <view class="editor-page">
    <!-- 工具栏 -->
    <view class="toolbar">
      <view class="toolbar-section">
        <text class="section-label">📐 画布大小</text>
        <view class="size-buttons">
          <button class="size-btn" :class="{ active: currentSize === 16 }" @click="changeSize(16)">16×16</button>
          <button class="size-btn" :class="{ active: currentSize === 32 }" @click="changeSize(32)">32×32</button>
          <button class="size-btn" :class="{ active: currentSize === 48 }" @click="changeSize(48)">48×48</button>
        </view>
      </view>
      
      <view class="toolbar-section">
        <text class="section-label">⚙️ 操作</text>
        <view class="action-buttons">
          <button class="action-btn danger" @click="clearCanvas">🗑️ 清空</button>
          <button class="action-btn primary" @click="saveArtwork">💾 保存</button>
          <button class="action-btn" @click="exportData">📤 导出</button>
        </view>
      </view>
    </view>

    <!-- 画布区域 -->
    <view 
      class="canvas-area" 
      @touchstart="handleCanvasTouchStart"
      @touchmove="handleCanvasTouchMove"
      @touchend="handleCanvasTouchEnd"
    >
      <view 
        class="canvas" 
        :style="{
          gridTemplateColumns: `repeat(${currentSize}, ${cellSize}rpx)`,
          gridTemplateRows: `repeat(${currentSize}, ${cellSize}rpx)`,
          width: `${currentSize * cellSize}rpx`,
          height: `${currentSize * cellSize}rpx`,
          transform: `scale(${scale})`
        }"
      >
        <view 
          v-for="(row, y) in gridData" 
          :key="'row-' + y" 
          class="canvas-row"
        >
          <view 
            v-for="(cell, x) in row" 
            :key="'cell-' + x + '-' + y" 
            class="canvas-cell" 
            :style="{ backgroundColor: cell ? cell.hex : '#ffffff' }"
            @mousedown="handleMouseClick(x, y)"
            @touchstart="handleTouchStart(x, y)">
          </view>
        </view>
      </view>
    </view>

    <!-- 颜色选择器 - 多行展示 -->
    <view class="color-picker">
      <view class="color-grid">
        <view 
          v-for="color in colorList" 
          :key="color.id" 
          class="color-btn"
          :class="{ active: currentColor.id === color.id }"
          @click="selectColor(color)"
        >
          <view class="color-dot" :style="{ backgroundColor: color.hex }"></view>
          <text class="color-name">{{ color.name }}</text>
        </view>
      </view>
    </view>

    <!-- 底部信息栏 -->
    <view class="bottom-bar">
      <view class="info-row">
        <view class="stats">
          <text class="stat-item">已用：<text class="value">{{ beadCount }}</text>颗</text>
          <text class="stat-item price">¥{{ estimatedPrice }}</text>
        </view>
        <button class="cart-btn" @click="addToCart">🛒 加入购物车</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      currentSize: 32,
      cellSize: 22,
      currentColor: { id: 2, name: '黑色', hex: '#000000' },
      gridData: [],
      beadCount: 0,
      estimatedPrice: '0.00',
      scale: 1,
      isPinching: false,
      initialDistance: 0,
      initialScale: 1,
      colorList: [
        { id: 2, name: '黑色', hex: '#000000' },
        { id: 3, name: '红色', hex: '#FF0000' },
        { id: 4, name: '橙色', hex: '#FFA500' },
        { id: 5, name: '黄色', hex: '#FFFF00' },
        { id: 6, name: '绿色', hex: '#00FF00' },
        { id: 7, name: '蓝色', hex: '#0000FF' },
        { id: 8, name: '紫色', hex: '#8000FF' },
        { id: 9, name: '粉色', hex: '#FFC0CB' },
        { id: 10, name: '棕色', hex: '#8B4513' },
        { id: 11, name: '灰色', hex: '#808080' },
        { id: 12, name: '青色', hex: '#00FFFF' },
        { id: 13, name: '深蓝', hex: '#00008B' },
        { id: 14, name: '深绿', hex: '#006400' },
        { id: 15, name: '金色', hex: '#FFD700' },
        { id: 16, name: '银色', hex: '#C0C0C0' },
        { id: 1, name: '白色', hex: '#FFFFFF' }
      ]
    }
  },

  onShow() {
    if (this.gridData.length === 0) {
      this.initCanvas()
    }
    setTimeout(() => {
      this.loadTemplate()
    }, 100)
  },

  methods: {
    loadTemplate() {
      const templateStr = uni.getStorageSync('using_template')
      if (!templateStr) return
      
      try {
        const template = JSON.parse(templateStr)
        if (template.canvasData && template.canvasData.length > 0) {
          this.currentSize = template.canvasSize?.width || 32
          this.cellSize = this.currentSize === 16 ? 40 : (this.currentSize === 32 ? 22 : 15)
          this.gridData = JSON.parse(JSON.stringify(template.canvasData))
          this.scale = 1
          this.updateCount()
          uni.removeStorageSync('using_template')
          uni.showToast({ title: `已加载：${template.name}`, icon: 'success' })
          return
        }
      } catch (e) {
        console.error('模板加载失败:', e)
      }
      
      if (this.gridData.length === 0) this.initCanvas()
    },

    initCanvas() {
      this.gridData = []
      for (let y = 0; y < this.currentSize; y++) {
        const row = []
        for (let x = 0; x < this.currentSize; x++) {
          row.push(null)
        }
        this.gridData.push(row)
      }
      this.updateCount()
    },

    updateCount() {
      let count = 0
      this.gridData.forEach(row => {
        row.forEach(cell => {
          if (cell) count++
        })
      })
      this.beadCount = count
      this.estimatedPrice = (count * 0.1 + 23).toFixed(2)
    },

    changeSize(size) {
      this.currentSize = size
      this.cellSize = size === 16 ? 40 : (size === 32 ? 22 : 15)
      this.initCanvas()
      this.scale = 1
      uni.vibrateShort()
    },

    selectColor(color) {
      this.currentColor = color
      uni.vibrateShort()
    },

    clearCanvas() {
      uni.showModal({
        title: '清空画布',
        content: '确定要清空吗？此操作不可恢复',
        confirmColor: '#f44336',
        success: (res) => {
          if (res.confirm) {
            this.initCanvas()
            this.scale = 1
            uni.showToast({ title: '已清空', icon: 'success' })
          }
        }
      })
    },

    saveArtwork() {
      if (this.beadCount === 0) {
        uni.showToast({ title: '先绘制图案吧', icon: 'none' })
        return
      }
      
      uni.showModal({
        title: '保存作品',
        editable: true,
        placeholderText: '请输入作品名称',
        confirmText: '保存',
        success: (res) => {
          if (res.confirm && res.content) {
            // 保存到本地存储（模拟云端）
            const artwork = {
              id: Date.now(),
              name: res.content,
              canvasSize: { width: this.currentSize, height: this.currentSize },
              canvasData: JSON.parse(JSON.stringify(this.gridData)),
              beadCount: this.beadCount,
              price: this.estimatedPrice,
              createdAt: new Date().toISOString()
            }
            
            // 获取现有作品列表
            const artworksStr = uni.getStorageSync('my_artworks')
            const artworks = artworksStr ? JSON.parse(artworksStr) : []
            artworks.push(artwork)
            uni.setStorageSync('my_artworks', JSON.stringify(artworks))
            
            uni.showToast({ title: '保存成功', icon: 'success' })
          }
        }
      })
    },

    exportData() {
      if (this.beadCount === 0) {
        uni.showToast({ title: '先绘制图案吧', icon: 'none' })
        return
      }
      
      const exportData = {
        canvasSize: { width: this.currentSize, height: this.currentSize },
        canvasData: this.gridData,
        beadCount: this.beadCount
      }
      
      const dataStr = JSON.stringify(exportData)
      uni.setClipboardData({
        data: dataStr,
        success: () => {
          uni.showModal({
            title: '导出成功',
            content: `画布数据已复制（${this.currentSize}×${this.currentSize}，${this.beadCount}颗豆子）\n\n可以直接粘贴到模板上传页面`,
            showCancel: false,
            confirmText: '好的'
          })
        }
      })
    },

    getDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    },

    handleCanvasTouchStart(e) {
      if (e.touches.length === 2) {
        this.isPinching = true
        this.initialDistance = this.getDistance(e.touches)
        this.initialScale = this.scale
      }
    },

    handleCanvasTouchMove(e) {
      if (this.isPinching && e.touches.length === 2) {
        const distance = this.getDistance(e.touches)
        const newScale = this.initialScale * (distance / this.initialDistance)
        this.scale = Math.min(Math.max(newScale, 0.5), 3)
      }
    },

    handleCanvasTouchEnd() {
      this.isPinching = false
    },

    handleMouseClick(x, y) {
      this.placeBead(x, y)
    },

    handleTouchStart(x, y) {
      this.placeBead(x, y)
    },

    placeBead(x, y) {
      if (y >= 0 && y < this.currentSize && x >= 0 && x < this.currentSize) {
        this.gridData[y][x] = { ...this.currentColor }
        this.updateCount()
      }
    },

    addToCart() {
      if (this.beadCount === 0) {
        uni.showToast({ title: '先创作作品吧', icon: 'none' })
        return
      }
      uni.showToast({ title: '已加入购物车', icon: 'success' })
    }
  }
}
</script>

<style lang="scss" scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.toolbar {
  background: white;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #eee;
  
  .toolbar-section {
    margin-bottom: 16rpx;
    &:last-child { margin-bottom: 0; }
    
    .section-label {
      display: block;
      font-size: 24rpx;
      color: #666;
      margin-bottom: 12rpx;
    }
    
    .size-buttons, .action-buttons {
      display: flex;
      gap: 12rpx;
    }
    
    .size-btn, .action-btn {
      flex: 1;
      padding: 14rpx;
      font-size: 24rpx;
      border-radius: 10rpx;
      background: #f5f5f5;
      border: none;
      
      &.active {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
      }
      
      &.primary {
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
      }
      
      &.danger {
        background: #fee;
        color: #f44;
      }
    }
  }
}

.canvas-area {
  overflow: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #e8eaed;
  padding: 10rpx 10rpx;
}

.canvas {
  display: grid;
  gap: 0;
  background: #ddd;
  border: 4rpx solid #ccc;
  border-radius: 8rpx;
  transform-origin: center center;
}

.canvas-row {
  display: contents;
}

.canvas-cell {
  border: 1rpx solid #d0d0d0;
  &:active { opacity: 0.8; }
}

.color-picker {
  background: white;
  padding: 16rpx 20rpx;
  border-top: 1rpx solid #eee;
  
  .color-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 12rpx;
  }
  
  .color-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6rpx;
    padding: 8rpx 4rpx;
    border-radius: 8rpx;
    background: transparent;
    border: 2rpx solid transparent;
    
    &.active {
      background: #f0f0ff;
      border-color: #667eea;
    }
  }
  
  .color-dot {
    width: 48rpx;
    height: 48rpx;
    border-radius: 50%;
    border: 2rpx solid rgba(0,0,0,0.1);
    box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.15);
  }
  
  .color-name {
    font-size: 20rpx;
    color: #666;
    text-align: center;
  }
}

.bottom-bar {
  bottom: 0;
  width: 100%;
  background: white;
  padding: 10rpx 20rpx 10rpx;
  border-top: 1rpx solid #eee;
  
  .info-row {
    display: flex;
    align-items: center;
    gap: 20rpx;
    
    .stats {
      display: flex;
      align-items: center;
      gap: 24rpx;
      flex: 1;
      
      .stat-item {
        font-size: 28rpx;
        color: #666;
        white-space: nowrap;
        
        .value {
          font-weight: bold;
          color: #333;
          font-size: 32rpx;
        }
        
        &.price .value {
          color: #667eea;
        }
      }
    }
    
    .cart-btn {
      flex: 0.5;
      height: 60rpx;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-size: 28rpx;
      font-weight: bold;
      border-radius: 14rpx;
      border: none;
      box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}
</style>
