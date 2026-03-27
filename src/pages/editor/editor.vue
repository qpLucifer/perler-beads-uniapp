<template>
  <view class="editor-page">
    <!-- 顶部工具栏 - 悬浮设计 -->
    <view class="floating-toolbar">
      <view class="toolbar-group">
        <view class="size-selector">
          <text class="label">画布</text>
          <view class="size-options">
            <view 
              class="size-option" 
              :class="{ active: currentSize === 16 }"
              @tap="changeSize(16)">16</view>
            <view 
              class="size-option"
              :class="{ active: currentSize === 32 }"
              @tap="changeSize(32)">32</view>
            <view 
              class="size-option"
              :class="{ active: currentSize === 48 }"
              @tap="changeSize(48)">48</view>
          </view>
        </view>
        
        <view class="divider"></view>
        
        <view class="action-group">
          <view 
            class="icon-btn" 
            :class="{ 'tool-active': tool === 'eraser' }" 
            @tap="toggleEraser">
            <text class="icon">🧹</text>
          </view>
          <view class="icon-btn" @tap="undo" v-if="canUndo">
            <text class="icon">↩️</text>
          </view>
          <view class="icon-btn" @tap="clearCanvas">
            <text class="icon">🗑️</text>
          </view>
          <view class="icon-btn primary" @tap="saveArtwork">
            <text class="icon">💾</text>
          </view>
        </view>
      </view>
    </view>

    <text class="canvas-hint">单指点击或滑动绘制 · 双指缩放 · {{ tool === 'eraser' ? '橡皮擦' : '画笔' }}</text>

    <!-- 画布区域 - 方形网格布局 -->
    <view class="canvas-scroll">
      <view class="canvas-wrapper">
        <view 
          class="canvas-board"
          :id="canvasId"
          :style="{
            transform: `scale(${scale})`,
            transformOrigin: 'top center'
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
              :class="{ 'has-bead': cell }"
              :style="{
                width: cellSize + 'rpx',
                height: cellSize + 'rpx'
              }"
            >
              <view 
                v-if="cell"
                class="bead"
                :style="{ backgroundColor: cell.hex }"
              >
                <view class="bead-highlight"></view>
              </view>
            </view>
          </view>
          <!-- Touch layer: draw / erase / pinch (cells are non-interactive below) -->
          <view
            class="canvas-touch-layer"
            @touchstart.stop.prevent="onLayerTouchStart"
            @touchmove.stop.prevent="onLayerTouchMove"
            @touchend.stop="onLayerTouchEnd"
            @touchcancel.stop="onLayerTouchEnd"
          />
        </view>
      </view>
    </view>

    <!-- 当前颜色指示器 -->
    <view class="current-color-indicator" :style="{ backgroundColor: currentColor.hex }">
      <view class="color-ring"></view>
      <text class="color-name">{{ currentColor.name }}</text>
    </view>

    <!-- 底部颜色选择器 -->
    <view class="color-picker-panel">
      <view class="color-tabs">
        <view 
          class="color-tab"
          :class="{ active: colorTab === 'basic' }"
          @tap="colorTab = 'basic'">基础</view>
        <view 
          class="color-tab"
          :class="{ active: colorTab === 'special' }"
          @tap="colorTab = 'special'">特殊</view>
        <view 
          class="color-tab"
          :class="{ active: colorTab === 'gradient' }"
          @tap="colorTab = 'gradient'">渐变</view>
      </view>
      
      <scroll-view class="color-scroll" scroll-x>
        <view class="color-list">
          <view 
            v-for="color in filteredColors" 
            :key="color.id" 
            class="color-item"
            :class="{ active: currentColor.id === color.id }"
            @tap="selectColor(color)"
          >
            <view 
              class="color-swatch"
              :style="{ backgroundColor: color.hex }"
            >
              <view v-if="currentColor.id === color.id" class="check-mark">✓</view>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 底部统计栏 -->
    <view class="stats-bar">
      <view class="stat-item">
        <text class="stat-icon">🔵</text>
        <text class="stat-value">{{ beadCount }}</text>
        <text class="stat-label">豆子</text>
      </view>
      <view class="stat-item">
        <text class="stat-icon">💰</text>
        <text class="stat-value price">¥{{ estimatedPrice }}</text>
        <text class="stat-label">预估</text>
      </view>
      <view class="stat-divider"></view>
      <view 
        class="action-btn-large" 
        :class="{ disabled: cartSubmitting }" 
        @tap="openCartSheet">
        <text class="btn-icon">{{ cartSubmitting ? '⏳' : '🛒' }}</text>
        <text class="btn-text">{{ cartSubmitting ? '处理中…' : '加入购物车' }}</text>
      </view>
    </view>

    <!-- Add-to-cart bottom sheet -->
    <view v-if="showCartSheet" class="cart-sheet-mask" @tap="onMaskTap">
      <view class="cart-sheet" @tap.stop>
        <view class="sheet-handle" />
        <text class="sheet-title">加入购物车</text>
        <text class="sheet-desc">作品会先保存到「我的作品」，再进入购物车结算</text>
        <input
          class="sheet-input"
          v-model="cartArtworkName"
          type="text"
          placeholder="给作品起个名字"
          maxlength="40"
        />
        <view class="sheet-meta">
          <text class="meta-line">豆子 {{ beadCount }} 颗</text>
          <text class="meta-line accent">预估 ¥{{ estimatedPrice }}</text>
        </view>
        <view class="sheet-actions">
          <button class="sheet-btn ghost" :disabled="cartSubmitting" @tap="closeCartSheet">取消</button>
          <button class="sheet-btn primary" :disabled="cartSubmitting || !cartNameValid" @tap="confirmAddToCart">
            {{ cartSubmitting ? '请稍候…' : '确认加入' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { userStore } from '@/stores/user.js'
import { createArtwork, addToCart as addArtworkToCartApi } from '@/api'
import { APP_EVENTS, emitAppEvent } from '@/utils/events.js'

export default {
  data() {
    return {
      canvasId: 'perler-canvas',
      currentSize: 32,
      cellSize: 24,
      currentColor: { id: 2, name: '黑色', hex: '#000000' },
      gridData: [],
      beadCount: 0,
      estimatedPrice: '0.00',
      scale: 1,
      isPinching: false,
      initialDistance: 0,
      initialScale: 1,
      canvasRect: null,
      // 历史记录（用于撤销）
      history: [],
      maxHistory: 20,
      // 颜色分类
      colorTab: 'basic',
      // 自动保存
      autoSaveTimer: null,
      lastSavedData: null,
      // Drawing / gesture
      tool: 'pen',
      boardRect: null,
      touchMoved: false,
      touchStartPos: { x: 0, y: 0 },
      lastPaintKey: '',
      strokeHistorySaved: false,
      // Add to cart sheet
      showCartSheet: false,
      cartArtworkName: '',
      cartSubmitting: false,
      colorList: [
        // 基础色
        { id: 1, name: '白色', hex: '#FFFFFF', category: 'basic' },
        { id: 2, name: '黑色', hex: '#000000', category: 'basic' },
        { id: 3, name: '红色', hex: '#FF3B30', category: 'basic' },
        { id: 4, name: '橙色', hex: '#FF9500', category: 'basic' },
        { id: 5, name: '黄色', hex: '#FFCC00', category: 'basic' },
        { id: 6, name: '绿色', hex: '#4CD964', category: 'basic' },
        { id: 7, name: '蓝色', hex: '#007AFF', category: 'basic' },
        { id: 8, name: '紫色', hex: '#5856D6', category: 'basic' },
        { id: 9, name: '粉色', hex: '#FF2D55', category: 'basic' },
        { id: 10, name: '棕色', hex: '#8B4513', category: 'basic' },
        { id: 11, name: '灰色', hex: '#8E8E93', category: 'basic' },
        { id: 12, name: '青色', hex: '#5AC8FA', category: 'basic' },
        // 特殊色
        { id: 13, name: '深蓝', hex: '#003366', category: 'special' },
        { id: 14, name: '深绿', hex: '#1B5E20', category: 'special' },
        { id: 15, name: '金色', hex: '#FFD700', category: 'special' },
        { id: 16, name: '银色', hex: '#C0C0C0', category: 'special' },
        { id: 17, name: '透明', hex: '#E8F4F8', category: 'special' },
        { id: 18, name: '荧光红', hex: '#FF1493', category: 'special' },
        { id: 19, name: '荧光绿', hex: '#00FF7F', category: 'special' },
        { id: 20, name: '荧光蓝', hex: '#1E90FF', category: 'special' },
        // 渐变色
        { id: 21, name: '浅蓝', hex: '#B3D9FF', category: 'gradient' },
        { id: 22, name: '天蓝', hex: '#66B3FF', category: 'gradient' },
        { id: 23, name: '淡粉', hex: '#FFB3D9', category: 'gradient' },
        { id: 24, name: '淡紫', hex: '#D9B3FF', category: 'gradient' },
        { id: 25, name: '薄荷绿', hex: '#B3FFD9', category: 'gradient' },
        { id: 26, name: '柠檬黄', hex: '#FFF5B3', category: 'gradient' },
        { id: 27, name: '珊瑚色', hex: '#FFB399', category: 'gradient' },
        { id: 28, name: '薰衣草', hex: '#E6E6FA', category: 'gradient' },
      ]
    }
  },

  computed: {
    filteredColors() {
      return this.colorList.filter(c => c.category === this.colorTab)
    },
    canUndo() {
      return this.history.length > 0
    },
    cartNameValid() {
      return (this.cartArtworkName || '').trim().length > 0
    }
  },

  async onShow() {
    if (this.gridData.length === 0) {
      // 尝试加载草稿
      const hasDraft = this.loadAutoSavedDraft()
      if (!hasDraft) {
        this.initCanvas()
      }
    }
    setTimeout(() => {
      this.loadTemplate()
    }, 100)
    this.$nextTick(() => {
      setTimeout(() => {
        this.updateCanvasRect()
      }, 100)
    })
  },

  methods: {
    uniqueArtworkName(raw) {
      const base = (raw || '').trim() || '未命名作品'
      const d = new Date()
      const p = (n) => String(n).padStart(2, '0')
      const stamp = `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
      return `${base} #${stamp}`
    },

    // 初始化画布
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

    toggleEraser() {
      this.tool = this.tool === 'eraser' ? 'pen' : 'eraser'
      uni.vibrateShort({ type: 'light' })
    },

    refreshBoardRect() {
      return new Promise((resolve) => {
        uni.createSelectorQuery()
          .in(this)
          .select('#' + this.canvasId)
          .boundingClientRect()
          .exec((res) => {
            if (res && res[0]) this.boardRect = res[0]
            resolve(this.boardRect)
          })
      })
    },

    touchToGrid(touch) {
      const rect = this.boardRect
      if (!rect || !rect.width) return { row: -1, col: -1 }
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const col = Math.min(
        this.currentSize - 1,
        Math.max(0, Math.floor((x / rect.width) * this.currentSize))
      )
      const row = Math.min(
        this.currentSize - 1,
        Math.max(0, Math.floor((y / rect.height) * this.currentSize))
      )
      return { row, col }
    },

    async onLayerTouchStart(e) {
      await this.refreshBoardRect()
      if (e.touches.length === 2) {
        this.isPinching = true
        this.initialDistance = this.getDistance(e.touches)
        this.initialScale = this.scale
        return
      }
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      this.touchStartPos = { x: t.clientX, y: t.clientY }
      this.touchMoved = false
      this.lastPaintKey = ''
      this.strokeHistorySaved = false
    },

    onLayerTouchMove(e) {
      if (this.isPinching && e.touches.length === 2) {
        const d = this.getDistance(e.touches)
        const ratio = d / (this.initialDistance || 1)
        let next = this.initialScale * ratio
        next = Math.min(2.5, Math.max(0.4, next))
        this.scale = next
        return
      }
      if (e.touches.length !== 1 || this.isPinching) return
      const t = e.touches[0]
      const dx = t.clientX - this.touchStartPos.x
      const dy = t.clientY - this.touchStartPos.y
      if (dx * dx + dy * dy > 36) this.touchMoved = true
      if (!this.touchMoved) return
      if (!this.strokeHistorySaved) {
        this.saveToHistory()
        this.strokeHistorySaved = true
      }
      this.paintAtTouch(t)
    },

    onLayerTouchEnd(e) {
      if (this.isPinching) {
        if (e.touches.length === 0) {
          this.isPinching = false
          setTimeout(() => this.refreshBoardRect(), 80)
        }
        return
      }
      const t = e.changedTouches[0]
      if (!this.touchMoved && t) {
        this.saveToHistory()
        const { row, col } = this.touchToGrid(t)
        if (row >= 0 && col >= 0) {
          this.toggleBead(col, row)
        }
      } else if (this.touchMoved) {
        this.triggerAutoSave()
        uni.vibrateShort({ type: 'light' })
      }
      this.lastPaintKey = ''
      this.touchMoved = false
    },

    paintAtTouch(touch) {
      const { row, col } = this.touchToGrid(touch)
      if (row < 0) return
      const key = `${row},${col}`
      if (key === this.lastPaintKey) return
      this.lastPaintKey = key
      if (this.tool === 'eraser') {
        this.gridData[row][col] = null
      } else {
        this.gridData[row][col] = { ...this.currentColor }
      }
      this.updateCount()
    },

    // Toggle cell on tap: pen cycles fill; eraser only removes
    toggleBead(x, y) {
      if (y >= 0 && y < this.currentSize && x >= 0 && x < this.currentSize) {
        const hasBead = !!this.gridData[y][x]

        if (this.tool === 'eraser') {
          if (hasBead) {
            this.gridData[y][x] = null
            uni.vibrateShort({ type: 'light' })
            this.updateCount()
            this.triggerAutoSave()
          }
          return
        }

        if (hasBead) {
          this.gridData[y][x] = null
          uni.vibrateShort({ type: 'light' })
        } else {
          this.gridData[y][x] = { ...this.currentColor }
          uni.vibrateShort({ type: 'medium' })
        }

        this.updateCount()
        this.triggerAutoSave()
      }
    },

    // 加载模板
    loadTemplate() {
      const templateStr = uni.getStorageSync('using_template')
      if (!templateStr) return
      
      try {
        const template = JSON.parse(templateStr)
        if (template.canvasData && template.canvasData.length > 0) {
          this.currentSize = template.canvasSize?.width || 32
          this.cellSize = this.currentSize === 16 ? 36 : (this.currentSize === 32 ? 24 : 18)
          this.gridData = JSON.parse(JSON.stringify(template.canvasData))
          this.updateCount()
          uni.removeStorageSync('using_template')
          uni.showToast({ title: `已加载：${template.name}`, icon: 'success' })
          setTimeout(() => this.refreshBoardRect(), 150)
          return
        }
      } catch (e) {
        console.error('模板加载失败:', e)
      }
      
      if (this.gridData.length === 0) this.initCanvas()
    },

    // 更新计数
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

    // 改变画布大小
    changeSize(size) {
      uni.vibrateShort({ type: 'medium' })
      this.currentSize = size
      this.cellSize = size === 16 ? 36 : (size === 32 ? 24 : 18)
      this.initCanvas()
      this.history = []
      setTimeout(() => {
        this.updateCanvasRect()
        this.refreshBoardRect()
      }, 120)
    },

    // 选择颜色
    selectColor(color) {
      this.currentColor = color
      if (this.tool === 'eraser') this.tool = 'pen'
      uni.vibrateShort({ type: 'light' })
    },

    // 清空画布
    clearCanvas() {
      uni.showModal({
        title: '清空画布',
        content: '确定要清空吗？此操作不可恢复',
        confirmColor: '#ff4757',
        success: (res) => {
          if (res.confirm) {
            this.saveToHistory()
            this.initCanvas()
            uni.vibrateShort({ type: 'heavy' })
            uni.showToast({ title: '已清空', icon: 'success' })
          }
        }
      })
    },

    // 撤销
    undo() {
      if (this.history.length === 0) return
      const lastState = this.history.pop()
      this.gridData = JSON.parse(JSON.stringify(lastState.gridData))
      this.beadCount = lastState.beadCount
      this.estimatedPrice = lastState.estimatedPrice
      uni.vibrateShort({ type: 'medium' })
      uni.showToast({ title: '已撤销', icon: 'none' })
    },

    // 保存历史记录
    saveToHistory() {
      if (this.history.length >= this.maxHistory) {
        this.history.shift()
      }
      this.history.push({
        gridData: JSON.parse(JSON.stringify(this.gridData)),
        beadCount: this.beadCount,
        estimatedPrice: this.estimatedPrice
      })
    },

    // 保存作品
    async saveArtwork() {
      if (this.beadCount === 0) {
        uni.showToast({ title: '先绘制图案吧', icon: 'none' })
        return
      }
      
      if (!userStore.isLoggedIn) {
        uni.showModal({
          title: '提示',
          content: '请先登录后再保存作品',
          confirmText: '去登录',
          success: (res) => {
            if (res.confirm) {
              uni.navigateTo({ url: '/pages/login/login' })
            }
          }
        })
        return
      }
      
      const modalResult = await new Promise((resolve) => {
        uni.showModal({
          title: '保存作品',
          editable: true,
          placeholderText: '请输入作品名称',
          confirmText: '保存',
          success: resolve
        })
      })
      
      if (!modalResult.confirm || !modalResult.content) {
        return
      }
      
      uni.showLoading({ title: '保存中...' })
      
      try {
        const result = await createArtwork({
          name: this.uniqueArtworkName(modalResult.content),
          canvas_size: this.currentSize,
          canvas_data: JSON.parse(JSON.stringify(this.gridData)),
          bead_count: this.beadCount,
          is_public: 1
        })
        
        uni.hideLoading()
        
        if (result.success) {
          uni.showToast({ title: '保存成功', icon: 'success' })
          this.history = []
          emitAppEvent(APP_EVENTS.ARTWORK_UPDATED, { source: 'editor' })
        } else {
          uni.showToast({ title: result.message || '保存失败', icon: 'none' })
        }
      } catch (error) {
        uni.hideLoading()
        console.error('保存作品失败:', error)
        uni.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    },

    // 导出
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
          uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
        }
      })
    },

    openCartSheet() {
      if (this.beadCount === 0) {
        uni.showToast({ title: '先创作作品吧', icon: 'none' })
        return
      }
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
      const d = new Date()
      const p = (n) => String(n).padStart(2, '0')
      this.cartArtworkName = `作品 ${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
      this.showCartSheet = true
    },

    closeCartSheet() {
      if (this.cartSubmitting) return
      this.showCartSheet = false
    },

    onMaskTap() {
      this.closeCartSheet()
    },

    async confirmAddToCart() {
      const name = (this.cartArtworkName || '').trim()
      if (!name || this.cartSubmitting) return

      this.cartSubmitting = true
      uni.showLoading({ title: '正在处理…' })

      try {
        const payload = {
          name: this.uniqueArtworkName(name),
          canvas_size: this.currentSize,
          canvas_data: JSON.parse(JSON.stringify(this.gridData)),
          bead_count: this.beadCount,
          is_public: 0
        }
        const saveResult = await createArtwork(payload)

        if (!saveResult.success) {
          uni.hideLoading()
          uni.showToast({ title: saveResult.message || '保存作品失败', icon: 'none' })
          return
        }

        const artworkId = saveResult.data?.artwork?.id
        if (!artworkId) {
          uni.hideLoading()
          uni.showToast({ title: '服务器未返回作品 ID', icon: 'none' })
          return
        }

        const cartResult = await addArtworkToCartApi({
          artwork_id: artworkId,
          quantity: 1
        })

        uni.hideLoading()

        if (cartResult.success) {
          this.showCartSheet = false
          uni.vibrateShort({ type: 'medium' })
          uni.showModal({
            title: '已加入购物车',
            content: '要继续创作还是去购物车结算？',
            confirmText: '去购物车',
            cancelText: '继续创作',
            success: (res) => {
              if (res.confirm) {
                uni.switchTab({ url: '/pages/cart/cart' })
              }
            }
          })
        } else {
          uni.showToast({ title: cartResult.message || '加入购物车失败', icon: 'none' })
        }
      } catch (error) {
        uni.hideLoading()
        console.error('添加到购物车失败:', error)
        uni.showToast({
          title: (error && error.message) || '网络异常，请重试',
          icon: 'none'
        })
      } finally {
        this.cartSubmitting = false
      }
    },

    // 计算双指距离
    getDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    },

    // 更新画布位置（用于缩放参考）
    updateCanvasRect() {
      const query = uni.createSelectorQuery().in(this)
      query.select('#' + this.canvasId).boundingClientRect()
      query.exec(res => {
        if (res && res[0]) {
          this.canvasRect = res[0]
        }
      })
    },

    // ========== 自动保存功能 ==========
    triggerAutoSave() {
      if (this.autoSaveTimer) clearTimeout(this.autoSaveTimer)
      
      this.autoSaveTimer = setTimeout(() => {
        this.autoSave()
      }, 5000) // 5 秒防抖
    },
    
    autoSave() {
      if (this.beadCount === 0) return
      
      const currentData = JSON.stringify(this.gridData)
      if (currentData === this.lastSavedData) return
      
      // 保存到本地存储作为草稿
      uni.setStorageSync('draft_canvas', JSON.stringify({
        canvasData: this.gridData,
        beadCount: this.beadCount,
        estimatedPrice: this.estimatedPrice,
        timestamp: Date.now()
      }))
      
      this.lastSavedData = currentData
      console.log('✅ 自动保存草稿')
    },
    
    loadAutoSavedDraft() {
      const draftStr = uni.getStorageSync('draft_canvas')
      if (!draftStr) return false
      
      try {
        const draft = JSON.parse(draftStr)
        if (draft.canvasData && draft.canvasData.length > 0) {
          this.gridData = draft.canvasData
          this.beadCount = draft.beadCount
          this.estimatedPrice = draft.estimatedPrice
          this.lastSavedData = JSON.stringify(this.gridData)
          return true
        }
      } catch (e) {
        console.error('加载草稿失败:', e)
      }
      return false
    }
  }
}
</script>

<style lang="scss" scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  overflow: hidden;
}

.canvas-hint {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.62);
  padding: 8rpx 32rpx 12rpx;
  margin-top: 88rpx;
  line-height: 1.5;
  flex-shrink: 0;
}

/* 悬浮工具栏 */
.floating-toolbar {
  position: fixed;
  top: calc(12rpx + env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20rpx);
  border-radius: 24rpx;
  padding: 16rpx 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.3);
  border: 1rpx solid rgba(255, 255, 255, 0.2);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.size-selector {
  display: flex;
  align-items: center;
  gap: 12rpx;
  
  .label {
    font-size: 24rpx;
    color: #666;
    font-weight: 500;
  }
  
  .size-options {
    display: flex;
    gap: 8rpx;
  }
  
  .size-option {
    padding: 10rpx 20rpx;
    border-radius: 12rpx;
    background: #f0f0f0;
    font-size: 24rpx;
    font-weight: 600;
    color: #666;
    transition: all 0.3s ease;
    
    &.active {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.4);
    }
  }
}

.divider {
  width: 2rpx;
  height: 40rpx;
  background: #e0e0e0;
}

.action-group {
  display: flex;
  gap: 12rpx;
}

.icon-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  .icon {
    font-size: 32rpx;
  }
  
  &.primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    
    .icon {
      filter: brightness(0) invert(1);
    }
  }
  
  &:active {
    transform: scale(0.9);
  }

  &.tool-active {
    background: linear-gradient(135deg, #ff9a56, #ff6b6b);
    box-shadow: 0 4rpx 14rpx rgba(255, 107, 107, 0.35);
  }
}

/* 画布滚动区域 */
.canvas-scroll {
  flex: 1;
  overflow: scroll;
  padding: 20rpx;
  padding-bottom: 32rpx;
  background: #f5f7fa;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

.canvas-wrapper {
  position: absolute;
  left: 50%;
  top: 58%;
  transform: translate(-50%,-50%);
}

/* 画布网格 */
.canvas-board {
  position: relative;
  background: #ffffff;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  padding: 8rpx;
  transform-origin: top center;
}

.canvas-touch-layer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 4;
  border-radius: 8rpx;
}

.canvas-row {
  display: flex;
}

.canvas-cell {
  width: 24rpx;
  height: 24rpx;
  border: 1rpx solid #e8eaed;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-sizing: border-box;
  
  &.has-bead {
    border: none;
    background: transparent;
  }
}

/* 3D 豆子 */
.bead {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  position: relative;
  box-shadow: 
    2rpx 2rpx 4rpx rgba(0, 0, 0, 0.15);
}

.bead-highlight {
  position: absolute;
  top: 15%;
  left: 15%;
  width: 30%;
  height: 30%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0) 70%
  );
}

/* 当前颜色指示器 */
.current-color-indicator {
  position: fixed;
  top: calc(88rpx + env(safe-area-inset-top));
  right: 20rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.3);
  border: 4rpx solid white;
  z-index: 90;
  
  .color-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    border: 4rpx solid rgba(255, 255, 255, 0.5);
    animation: pulse 2s infinite;
  }
  
  .color-name {
    font-size: 20rpx;
    color: white;
    font-weight: 600;
    text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.5);
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
}

/* 颜色选择器面板 */
.color-picker-panel {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 32rpx 32rpx 0 0;
  padding: 20rpx;
  box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.2);
}

.color-tabs {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.color-tab {
  flex: 1;
  padding: 12rpx;
  text-align: center;
  border-radius: 12rpx;
  background: #f5f5f5;
  font-size: 24rpx;
  color: #666;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &.active {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
  }
}

.color-scroll {
  white-space: nowrap;
}

.color-list {
  display: inline-flex;
  gap: 12rpx;
  padding: 8rpx 0;
}

.color-item {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &.active {
    transform: scale(1.1);
    box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.4);
  }
}

.color-swatch {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
  position: relative;
}

.check-mark {
  color: white;
  font-size: 32rpx;
  font-weight: bold;
  text-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.3);
}

/* 统计栏 */
.stats-bar {
  background: rgba(255, 255, 255, 0.98);
  padding: 20rpx 24rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  gap: 24rpx;
  border-top: 1rpx solid #f0f0f0;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  
  .stat-icon {
    font-size: 28rpx;
  }
  
  .stat-value {
    font-size: 32rpx;
    font-weight: 700;
    color: #333;
    
    &.price {
      color: #667eea;
    }
  }
  
  .stat-label {
    font-size: 22rpx;
    color: #999;
  }
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: #e0e0e0;
}

.action-btn-large {
  flex: 1;
  height: 80rpx;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.4);

  &.disabled {
    opacity: 0.55;
    pointer-events: none;
  }
  
  .btn-icon {
    font-size: 36rpx;
  }
  
  .btn-text {
    font-size: 28rpx;
    font-weight: 600;
    color: white;
  }
}

/* Add-to-cart sheet */
.cart-sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.cart-sheet {
  width: 100%;
  max-height: 72vh;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 16rpx 32rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  animation: sheet-up 0.28s ease-out;
}

@keyframes sheet-up {
  from {
    transform: translateY(100%);
    opacity: 0.6;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.sheet-handle {
  width: 72rpx;
  height: 8rpx;
  background: #e0e0e0;
  border-radius: 4rpx;
  margin: 0 auto 20rpx;
}

.sheet-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 12rpx;
}

.sheet-desc {
  display: block;
  font-size: 24rpx;
  color: #888;
  line-height: 1.5;
  margin-bottom: 24rpx;
}

.sheet-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: #f5f7fa;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #333;
  box-sizing: border-box;
  margin-bottom: 20rpx;
}

.sheet-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28rpx;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #f8f9ff, #f0f2ff);
  border-radius: 16rpx;

  .meta-line {
    font-size: 26rpx;
    color: #555;

    &.accent {
      font-weight: 700;
      color: #667eea;
    }
  }
}

.sheet-actions {
  display: flex;
  gap: 20rpx;
}

.sheet-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  text-align: center;

  &::after {
    border: none;
  }

  &.ghost {
    background: #f0f0f0;
    color: #666;
  }

  &.primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: #fff;
  }

  &[disabled] {
    opacity: 0.45;
  }
}
</style>
