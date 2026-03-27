<template>
  <view class="editor-page">
    <!-- 方案 1: 简洁白板风格 - 类似真实拼豆底板 -->
    <view class="canvas-scene-1" v-if="designStyle === 1">
      <view class="pegboard">
        <view 
          v-for="(row, y) in gridData" 
          :key="'row-' + y" 
          class="board-row"
        >
          <view 
            v-for="(cell, x) in row" 
            :key="'cell-' + x + '-' + y" 
            class="peg-hole"
            :class="{ 'has-bead': cell }"
            @tap="handleTap(x, y)"
          >
            <view v-if="cell" class="bead-3d" :style="{ backgroundColor: cell.hex }"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 方案 2: 像素艺术风格 - 复古像素感 -->
    <view class="canvas-scene-2" v-if="designStyle === 2">
      <view class="pixel-canvas">
        <view 
          v-for="(row, y) in gridData" 
          :key="'row-' + y" 
          class="pixel-row"
        >
          <view 
            v-for="(cell, x) in row" 
            :key="'cell-' + x + '-' + y" 
            class="pixel-cell"
            :class="{ filled: cell }"
            :style="{ backgroundColor: cell ? cell.hex : 'transparent' }"
            @tap="handleTap(x, y)"
          ></view>
        </view>
      </view>
    </view>

    <!-- 方案 3: 圆形凹槽风格 - 类似真实工艺盘 -->
    <view class="canvas-scene-3" v-if="designStyle === 3">
      <view class="tray-board">
        <view 
          v-for="(row, y) in gridData" 
          :key="'row-' + y" 
          class="tray-row"
        >
          <view 
            v-for="(cell, x) in row" 
            :key="'cell-' + x + '-' + y" 
            class="tray-slot"
            @tap="handleTap(x, y)"
          >
            <view v-if="cell" class="bead-in-slot" :style="{ backgroundColor: cell.hex }"></view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    designStyle: {
      type: Number,
      default: 1  // 1=白板，2=像素，3=圆槽
    },
    gridData: Array,
    currentSize: Number
  },
  methods: {
    handleTap(x, y) {
      this.$emit('tap-cell', { x, y })
    }
  }
}
</script>

<style lang="scss" scoped>
/* ========== 方案 1: 简洁白板风格 ========== */
.canvas-scene-1 {
  background: #f5f5f5;
  padding: 20rpx;
  border-radius: 16rpx;
}

.pegboard {
  display: grid;
  gap: 2rpx;
  background: #e0e0e0;
  padding: 12rpx;
  border-radius: 12rpx;
  box-shadow: inset 0 4rpx 12rpx rgba(0,0,0,0.1);
}

.board-row {
  display: flex;
  gap: 2rpx;
}

.peg-hole {
  width: 26rpx;
  height: 26rpx;
  background: #fff;
  border-radius: 4rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2rpx 4rpx rgba(0,0,0,0.08);
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.95);
  }
  
  &.has-bead {
    box-shadow: none;
  }
}

.bead-3d {
  width: 90%;
  height: 90%;
  border-radius: 6rpx;
  box-shadow: 
    2rpx 2rpx 4rpx rgba(0,0,0,0.2),
    inset 2rpx 2rpx 4rpx rgba(255,255,255,0.3);
}

/* ========== 方案 2: 像素艺术风格 ========== */
.canvas-scene-2 {
  background: #1a1a2e;
  padding: 20rpx;
  border-radius: 16rpx;
}

.pixel-canvas {
  display: grid;
  gap: 0;
  background: #0f0f1a;
  border: 4rpx solid #333;
  border-radius: 8rpx;
  overflow: hidden;
}

.pixel-row {
  display: flex;
}

.pixel-cell {
  width: 24rpx;
  height: 24rpx;
  border: 1rpx solid rgba(255,255,255,0.05);
  transition: all 0.1s ease;
  
  &:active {
    opacity: 0.7;
  }
  
  &.filled {
    border: none;
    box-shadow: 
      inset 2rpx 2rpx 4rpx rgba(255,255,255,0.2),
      inset -2rpx -2rpx 4rpx rgba(0,0,0,0.2);
  }
}

/* ========== 方案 3: 圆形凹槽风格 ========== */
.canvas-scene-3 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24rpx;
  border-radius: 20rpx;
}

.tray-board {
  display: grid;
  gap: 6rpx;
  background: rgba(0,0,0,0.2);
  padding: 16rpx;
  border-radius: 16rpx;
  box-shadow: inset 0 4rpx 16rpx rgba(0,0,0,0.3);
}

.tray-row {
  display: flex;
  gap: 6rpx;
}

.tray-slot {
  width: 28rpx;
  height: 28rpx;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    inset 0 2rpx 8rpx rgba(0,0,0,0.3),
    0 2rpx 4rpx rgba(255,255,255,0.1);
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.9);
    box-shadow: 
      inset 0 4rpx 12rpx rgba(0,0,0,0.4),
      0 1rpx 2rpx rgba(255,255,255,0.05);
  }
}

.bead-in-slot {
  width: 80%;
  height: 80%;
  border-radius: 50%;
  box-shadow: 
    2rpx 2rpx 6rpx rgba(0,0,0,0.3),
    inset 2rpx 2rpx 4rpx rgba(255,255,255,0.4);
  animation: dropIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes dropIn {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
</style>
