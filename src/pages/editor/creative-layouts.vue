<template>
  <view class="editor-page">
    
    <!-- 方案 A: 蜂窝六边形布局 -->
    <view class="canvas-hex" v-if="layoutStyle === 'hex'">
      <view class="hex-board">
        <view 
          v-for="(row, y) in hexGrid" 
          :key="'row-' + y" 
          class="hex-row"
          :style="{ marginLeft: (y % 2) * 30 + 'rpx' }"
        >
          <view 
            v-for="(cell, x) in row" 
            :key="'cell-' + x + '-' + y" 
            class="hex-cell"
            :class="{ filled: cell }"
            @tap="handleTap(x, y)"
          >
            <view v-if="cell" class="bead-hex" :style="{ backgroundColor: cell.hex }"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 方案 B: 放射状圆形布局 -->
    <view class="canvas-radial" v-if="layoutStyle === 'radial'">
      <view class="radial-board">
        <view 
          v-for="(ring, r) in radialGrid" 
          :key="'ring-' + r" 
          class="radial-ring"
          :style="{ 
            width: (r + 1) * 60 + 'rpx',
            height: (r + 1) * 60 + 'rpx'
          }"
        >
          <view 
            v-for="(cell, i) in ring" 
            :key="'cell-' + r + '-' + i" 
            class="radial-cell"
            :class="{ filled: cell }"
            :style="getRadialStyle(r, i, ring.length)"
            @tap="handleRadialTap(r, i)"
          >
            <view v-if="cell" class="bead-radial" :style="{ backgroundColor: cell.hex }"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 方案 C: 自由散点布局 -->
    <view class="canvas-free" v-if="layoutStyle === 'free'">
      <view class="free-board">
        <view 
          v-for="(dot, index) in freeDots" 
          :key="'dot-' + index" 
          class="free-dot"
          :class="{ filled: dot.filled }"
          :style="{
            left: dot.x + 'rpx',
            top: dot.y + 'rpx',
            backgroundColor: dot.filled ? dot.color : 'rgba(255,255,255,0.1)'
          }"
          @tap="handleFreeTap(index)"
        >
          <view v-if="dot.filled" class="bead-free" :style="{ backgroundColor: dot.color }"></view>
        </view>
      </view>
    </view>

    <!-- 方案 D: 心形布局 -->
    <view class="canvas-heart" v-if="layoutStyle === 'heart'">
      <view class="heart-board">
        <view 
          v-for="(cell, index) in heartGrid" 
          :key="'heart-' + index" 
          class="heart-cell"
          :class="{ filled: cell.filled }"
          :style="{
            left: cell.x + 'rpx',
            top: cell.y + 'rpx'
          }"
          @tap="handleHeartTap(index)"
        >
          <view v-if="cell.filled" class="bead-heart" :style="{ backgroundColor: cell.color }"></view>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
export default {
  props: {
    layoutStyle: {
      type: String,
      default: 'hex'  // hex, radial, free, heart
    },
    gridData: Array,
    currentSize: Number
  },
  data() {
    return {
      hexGrid: [],
      radialGrid: [],
      freeDots: [],
      heartGrid: []
    }
  },
  watch: {
    gridData: {
      handler() {
        this.initLayout()
      },
      deep: true,
      immediate: true
    },
    layoutStyle() {
      this.initLayout()
    }
  },
  methods: {
    initLayout() {
      if (this.layoutStyle === 'hex') this.initHexGrid()
      if (this.layoutStyle === 'radial') this.initRadialGrid()
      if (this.layoutStyle === 'free') this.initFreeDots()
      if (this.layoutStyle === 'heart') this.initHeartGrid()
    },

    // 初始化六边形网格
    initHexGrid() {
      this.hexGrid = []
      const rows = Math.ceil(this.currentSize * 0.87)
      for (let y = 0; y < rows; y++) {
        const row = []
        const cols = y % 2 === 0 ? this.currentSize : this.currentSize - 1
        for (let x = 0; x < cols; x++) {
          row.push(null)
        }
        this.hexGrid.push(row)
      }
    },

    // 初始化放射状网格
    initRadialGrid() {
      this.radialGrid = []
      const rings = Math.floor(this.currentSize / 2)
      for (let r = 0; r < rings; r++) {
        const ring = []
        const cells = Math.max(6, r * 6)
        for (let i = 0; i < cells; i++) {
          ring.push(null)
        }
        this.radialGrid.push(ring)
      }
    },

    // 初始化自由散点
    initFreeDots() {
      this.freeDots = []
      const size = 400
      const count = this.currentSize * this.currentSize
      for (let i = 0; i < count; i++) {
        this.freeDots.push({
          x: Math.random() * size,
          y: Math.random() * size,
          filled: false,
          color: null
        })
      }
    },

    // 初始化心形网格
    initHeartGrid() {
      this.heartGrid = []
      const centerX = 200
      const centerY = 200
      const scale = 8
      
      for (let y = -30; y <= 30; y += 2) {
        for (let x = -30; x <= 30; x += 2) {
          // 心形公式
          const heart = Math.pow(x*x + y*y - 100, 3) - Math.pow(x, 2) * Math.pow(y, 3)
          if (heart <= 0) {
            this.heartGrid.push({
              x: centerX + x * scale,
              y: centerY + y * scale,
              filled: false,
              color: null
            })
          }
        }
      }
    },

    getRadialStyle(ring, index, total) {
      const angle = (index / total) * 360
      return {
        transform: `rotate(${angle}deg)`
      }
    },

    handleTap(x, y) {
      this.$emit('tap-cell', { x, y, type: 'hex' })
    },

    handleRadialTap(ring, index) {
      this.$emit('tap-cell', { ring, index, type: 'radial' })
    },

    handleFreeTap(index) {
      this.$emit('tap-cell', { index, type: 'free' })
    },

    handleHeartTap(index) {
      this.$emit('tap-cell', { index, type: 'heart' })
    }
  }
}
</script>

<style lang="scss" scoped>
/* ========== 方案 A: 蜂窝六边形布局 ========== */
.canvas-hex {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx;
  border-radius: 24rpx;
  overflow: auto;
}

.hex-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.hex-row {
  display: flex;
  gap: 6rpx;
}

.hex-cell {
  width: 50rpx;
  height: 58rpx;
  background: rgba(255,255,255,0.15);
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.9);
  }
  
  &.filled {
    background: transparent;
  }
}

.bead-hex {
  width: 80%;
  height: 80%;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  box-shadow: 
    2rpx 2rpx 6rpx rgba(0,0,0,0.3),
    inset 2rpx 2rpx 4rpx rgba(255,255,255,0.4);
  animation: popIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes popIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* ========== 方案 B: 放射状圆形布局 ========== */
.canvas-radial {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  padding: 40rpx;
  border-radius: 50%;
  overflow: hidden;
  aspect-ratio: 1;
}

.radial-board {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.radial-ring {
  position: absolute;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.radial-cell {
  position: absolute;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.9);
  }
  
  &.filled {
    background: transparent;
  }
}

.bead-radial {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  box-shadow: 
    2rpx 2rpx 6rpx rgba(0,0,0,0.3),
    inset 2rpx 2rpx 4rpx rgba(255,255,255,0.4);
  animation: popIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* ========== 方案 C: 自由散点布局 ========== */
.canvas-free {
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  padding: 40rpx;
  border-radius: 24rpx;
  position: relative;
  height: 500rpx;
  overflow: hidden;
}

.free-board {
  position: relative;
  width: 100%;
  height: 100%;
}

.free-dot {
  position: absolute;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.9);
  }
  
  &.filled {
    background: transparent;
  }
}

.bead-free {
  width: 85%;
  height: 85%;
  border-radius: 50%;
  box-shadow: 
    2rpx 2rpx 6rpx rgba(0,0,0,0.3),
    inset 2rpx 2rpx 4rpx rgba(255,255,255,0.4);
  animation: popIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* ========== 方案 D: 心形布局 ========== */
.canvas-heart {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff8e8e 100%);
  padding: 40rpx;
  border-radius: 24rpx;
  position: relative;
  height: 500rpx;
  overflow: hidden;
}

.heart-board {
  position: relative;
  width: 100%;
  height: 100%;
}

.heart-cell {
  position: absolute;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.9);
  }
  
  &.filled {
    background: transparent;
  }
}

.bead-heart {
  width: 85%;
  height: 85%;
  border-radius: 50%;
  box-shadow: 
    2rpx 2rpx 6rpx rgba(0,0,0,0.3),
    inset 2rpx 2rpx 4rpx rgba(255,255,255,0.4);
  animation: popIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
</style>
