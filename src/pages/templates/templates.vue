<template>
  <view class="templates-page">
    <view class="filter-section">
      <scroll-view scroll-x class="filter-scroll">
        <view class="filter-tags">
          <view class="filter-tag" :class="{ active: selectedCategory === 'all' }" @tap="selectCategory('all')">全部</view>
          <view class="filter-tag" :class="{ active: selectedCategory === 'animal' }" @tap="selectCategory('animal')">🐾 动物</view>
          <view class="filter-tag" :class="{ active: selectedCategory === 'cartoon' }" @tap="selectCategory('cartoon')">🎬 卡通</view>
          <view class="filter-tag" :class="{ active: selectedCategory === 'pattern' }" @tap="selectCategory('pattern')">✨ 图案</view>
        </view>
      </scroll-view>
    </view>

    <view class="templates-list">
      <view class="template-card" v-for="template in filteredTemplates" :key="template.id" @tap="useTemplate(template)">
        <view class="template-thumbnail">
          <view
            v-if="template.thumbGrid && template.thumbGrid.length"
            class="thumb-wrap"
          >
            <view
              v-for="(hex, i) in template.thumbGrid"
              :key="i"
              class="thumb-cell"
              :style="{
                backgroundColor: hex || 'transparent',
                width: `${100 / thumbSize}%`,
                height: `${100 / thumbSize}%`
              }"
            />
          </view>
          <text v-else class="thumb-fallback">{{ template.thumbnail }}</text>
        </view>
        <view class="template-info">
          <view class="name-row">
            <text class="template-name">{{ template.name }}</text>
            <text v-if="template.isOfficial" class="badge badge-official">官方</text>
            <text v-else class="badge badge-user">用户</text>
          </view>
          <view class="template-meta">
            <text class="template-difficulty" :class="getDifficultyClass(template.difficulty)">{{ template.difficulty }}</text>
            <text class="meta-item">使用 {{ formatNumber(template.useCount) }}</text>
            <view class="like-btn" :class="{ liked: template.myLiked }" @tap.stop="toggleLike(template)">
              <text class="like-icon">{{ template.myLiked ? '❤️' : '🤍' }}</text>
              <text class="like-count">{{ formatNumber(template.likeCount) }}</text>
            </view>
          </view>
        </view>
        <button class="use-btn" @tap.stop="useTemplate(template)">使用</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getTemplates, toggleTemplateLike, markTemplateUsed } from '@/api'

const selectedCategory = ref('all')
const templates = ref([])
const loading = ref(false)

const thumbSize = 10

function buildThumbGrid(canvasData) {
  const size = thumbSize
  if (!Array.isArray(canvasData) || canvasData.length === 0) {
    return Array(size * size).fill(null)
  }
  const height = canvasData.length
  const width = Array.isArray(canvasData[0]) ? canvasData[0].length : size

  const stepY = height / size
  const stepX = width / size
  const flat = []

  for (let ty = 0; ty < size; ty++) {
    for (let tx = 0; tx < size; tx++) {
      const y0 = Math.floor(ty * stepY)
      const y1 = Math.max(y0 + 1, Math.floor((ty + 1) * stepY))
      const x0 = Math.floor(tx * stepX)
      const x1 = Math.max(x0 + 1, Math.floor((tx + 1) * stepX))

      let chosen = null
      for (let y = y0; y < Math.min(y1, height); y++) {
        for (let x = x0; x < Math.min(x1, width); x++) {
          const c = canvasData[y]?.[x]
          if (c && c.hex) {
            chosen = c.hex
            break
          }
        }
        if (chosen) break
      }
      flat.push(chosen)
    }
  }
  return flat
}

function generateFallbackCanvasByName(name, size = 32) {
  const n = String(name || '')
  const make = () => Array.from({ length: size }, () => Array(size).fill(null))
  const canvas = make()

  const fillCircle = (hex) => {
    const cx = size / 2
    const cy = size / 2
    const r = size / 2.3
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx
        const dy = y - cy
        if (Math.sqrt(dx * dx + dy * dy) <= r) {
          canvas[y][x] = { id: 'fallback', name: 'fallback', hex }
        }
      }
    }
  }

  const fillSquare = (hex) => {
    const m = 2
    for (let y = m; y < size - m; y++) {
      for (let x = m; x < size - m; x++) {
        canvas[y][x] = { id: 'fallback', name: 'fallback', hex }
      }
    }
  }

  const fillHeart = (hex) => {
    const cx = size / 2
    const cy = size / 2 - 2
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / (size / 8)
        const dy = (y - cy) / (size / 8)
        const heart = Math.pow(dx * dx + dy * dy - 1, 3) - dx * dx * dy * dy * dy
        if (heart <= 0) canvas[y][x] = { id: 'fallback', name: 'fallback', hex }
      }
    }
  }

  const fillStar = (hex) => {
    const cx = size / 2
    const cy = size / 2
    const outerR = size / 2.2
    const innerR = size / 4.5
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx
        const dy = y - cy
        const d = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)
        const starR = (angle % (Math.PI / 5)) < (Math.PI / 10) ? innerR : outerR
        if (d < starR * 0.9) canvas[y][x] = { id: 'fallback', name: 'fallback', hex }
      }
    }
  }

  if (n.includes('心')) fillHeart('#FFC0CB')
  else if (n.includes('星')) fillStar('#FFD700')
  else if (n.includes('绿') || n.includes('方')) fillSquare('#00FF00')
  else if (n.includes('蓝')) fillCircle('#0000FF')
  else if (n.includes('紫')) fillCircle('#8000FF')
  else fillCircle('#FF0000')

  return canvas
}

const pickTemplateThumbnail = (tpl) => {
  if (tpl && tpl.image_url && /^https?:\/\//.test(tpl.image_url)) {
    return { type: 'image', value: tpl.image_url }
  }
  const sourceName = String(tpl?.name || '')
  const m = sourceName.match(/[❤️⭐🔴🔵🟩🟣🐾🎬✨🎨]/)
  return { type: 'emoji', value: m ? m[0] : '🎨' }
}

// 加载模板数据
const loadTemplates = async () => {
  loading.value = true
  try {
    const res = await getTemplates()
    if (res.success && res.data.templates) {
      // 转换后端数据为前端格式
      templates.value = res.data.templates.map(t => {
        let beadData = t.bead_data
        if (typeof beadData === 'string') {
          try { beadData = JSON.parse(beadData) } catch(e) { beadData = { cells: [] } }
        }
        
        // 从 bead_data 生成 canvasData（二维数组格式）
        const size = t.width || t.canvas_size || 32
        let canvasData = beadDataToCanvas(beadData, size)
        const nonEmpty = canvasData.some(row => row.some(cell => !!cell))
        if (!nonEmpty) {
          canvasData = generateFallbackCanvasByName(t.name, size)
        }
        const canvasHeight = Array.isArray(canvasData) ? canvasData.length : size
        const canvasWidth = Array.isArray(canvasData?.[0]) ? canvasData[0].length : size
        
        // 提取缩略图 emoji
        const thumb = pickTemplateThumbnail(t)
        
        return {
          id: t.id,
          name: String(t.name || '未命名模板').replace(/[❤️⭐🔴🔵🟩🟣]/, '').trim(),
          thumbnail: thumb.value,
          thumbnailType: thumb.type,
          difficulty: t.difficulty || '简单',
          useCount: t.download_count || 0,
          likeCount: t.like_count || 0,
          myLiked: !!t.my_liked,
          isOfficial: !!t.is_official,
          category: t.category || '图案',
          canvasSize: { width: canvasWidth, height: canvasHeight },
          canvasData: canvasData,
          thumbGrid: buildThumbGrid(canvasData)
        }
      })
    }
  } catch (error) {
    console.error('加载模板失败:', error)
    // 如果 API 失败，使用默认数据
    loadDefaultTemplates()
  } finally {
    loading.value = false
  }
}

// 从 bead_data 转换为 canvasData
const beadDataToCanvas = (beadData, size = 32) => {
  if (!beadData) {
    return Array.from({ length: size }, () => Array(size).fill(null))
  }

  // Already canvas 2D matrix
  if (Array.isArray(beadData) && Array.isArray(beadData[0])) {
    return beadData
  }

  const width = beadData.width || size
  const height = beadData.height || size
  const canvas = []
  
  // 初始化空画布
  for (let y = 0; y < height; y++) {
    const row = []
    for (let x = 0; x < width; x++) {
      row.push(null)
    }
    canvas.push(row)
  }
  
  // 填充拼豆数据
  if (beadData.cells && Array.isArray(beadData.cells)) {
    beadData.cells.forEach(cell => {
      if (cell.row >= 0 && cell.row < height && cell.col >= 0 && cell.col < width) {
        // Template's bead_data often stores English color keywords (e.g. pink/red).
        // We map known values to hex so the pattern can be displayed.
        const colorKey = String(cell.color || '').toLowerCase()
        const aliasHexMap = {
          pink: '#FFC0CB',
          gold: '#FFD700',
          red: '#FF0000',
          blue: '#0000FF',
          green: '#00FF00',
          purple: '#8000FF'
        }

        const hex = aliasHexMap[colorKey] || '#000000'
        canvas[cell.row][cell.col] = {
          id: cell.color,
          name: cell.color,
          hex
        }
      }
    })
  }
  
  return canvas
}

// 默认模板数据
const loadDefaultTemplates = () => {
  templates.value = [
    { id: 1, name: '心形', thumbnail: '❤️', thumbnailType: 'emoji', difficulty: '简单', downloads: 2300, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: [] },
    { id: 2, name: '星星', thumbnail: '⭐', thumbnailType: 'emoji', difficulty: '简单', downloads: 1890, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: [] },
    { id: 3, name: '红色圆形', thumbnail: '🔴', thumbnailType: 'emoji', difficulty: '简单', downloads: 1520, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: [] },
    { id: 4, name: '蓝色圆形', thumbnail: '🔵', thumbnailType: 'emoji', difficulty: '简单', downloads: 1280, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: [] },
    { id: 5, name: '绿色方块', thumbnail: '🟩', thumbnailType: 'emoji', difficulty: '简单', downloads: 1150, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: [] },
    { id: 6, name: '紫色圆形', thumbnail: '🟣', thumbnailType: 'emoji', difficulty: '简单', downloads: 980, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: [] }
  ]
}

// 根据分类筛选
const filteredTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return templates.value
  }
  // 支持多种分类字段名
  const categoryMap = {
    'animal': ['动物', 'animal'],
    'cartoon': ['卡通', 'cartoon'],
    'pattern': ['图案', 'pattern', '其他']
  }
  const targetCategories = categoryMap[selectedCategory.value] || [selectedCategory.value]
  return templates.value.filter(t => {
    const category = t.category || ''
    return targetCategories.some(cat => category.includes(cat) || cat.includes(category))
  })
})

const selectCategory = (category) => {
  selectedCategory.value = category
  uni.vibrateShort()
}

const formatNumber = (num) => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

const getDifficultyClass = (difficulty) => {
  const map = { '简单': 'difficulty-easy', '中等': 'difficulty-medium', '困难': 'difficulty-hard' }
  return map[difficulty] || ''
}

const useTemplate = (template) => {
  console.log('点击模板:', template)
  
  uni.showModal({
    title: '使用模板',
    content: `确定要使用"${template.name}"模板吗？\n画布大小：${template.canvasSize?.width || 32}×${template.canvasSize?.height || 32}`,
    confirmText: '使用',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        // Count as "used" on backend (best-effort).
        markTemplateUsed(template.id)
          .then((r) => {
            const newCount = Number(r?.data?.use_count)
            if (Number.isFinite(newCount)) template.useCount = newCount
          })
          .catch(() => {})

        // 将模板数据保存到本地存储
        const templateData = {
          canvasSize: template.canvasSize || { width: 32, height: 32 },
          canvasData: template.canvasData || [],
          name: template.name
        }
        
        uni.setStorageSync('using_template', JSON.stringify(templateData))
        
        uni.showToast({
          title: '模板已加载',
          icon: 'success'
        })
        
        // 跳转到创作中心
        setTimeout(() => {
          uni.switchTab({
            url: '/pages/editor/editor'
          })
        }, 500)
      }
    }
  })
}

const toggleLike = async (template) => {
  try {
    const res = await toggleTemplateLike(template.id)
    if (res?.success) {
      template.myLiked = !!res.data?.liked
      const n = Number(res.data?.like_count)
      if (Number.isFinite(n)) template.likeCount = n
    }
  } catch (e) {
    // 401 will be handled globally in api layer.
  }
}

// 页面加载时获取模板
onShow(() => {
  loadTemplates()
})
</script>

<style lang="scss" scoped>
$primary-color: #667eea;
$secondary-color: #764ba2;

.templates-page {
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

.templates-list {
  padding: 0 24rpx;
  
  .template-card {
    display: flex;
    align-items: center;
    background: white;
    border-radius: 24rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    
    .template-thumbnail {
      width: 140rpx;
      height: 140rpx;
      background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
      border-radius: 20rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 80rpx;
      margin-right: 24rpx;
      overflow: hidden;

      .thumb-wrap {
        width: 122rpx;
        height: 122rpx;
        display: flex;
        flex-wrap: wrap;
        overflow: hidden;
      }

      .thumb-cell {
        flex: 0 0 auto;
        background-color: transparent;
      }

      .thumb-fallback {
        display: block;
        color: #fff;
      }
    }
    
    .template-info {
      flex: 1;
      
      .name-row {
        display: flex;
        align-items: center;
        gap: 12rpx;
        margin-bottom: 16rpx;

        .template-name {
          display: block;
          font-size: 32rpx;
          font-weight: bold;
          color: #333;
        }

        .badge {
          padding: 6rpx 16rpx;
          border-radius: 18rpx;
          font-size: 22rpx;
          line-height: 1;
        }
        .badge-official {
          background: #fff3e0;
          color: #ff9800;
        }
        .badge-user {
          background: #e3f2fd;
          color: #1976d2;
        }
      }
      
      .template-meta {
        display: flex;
        align-items: center;
        gap: 16rpx;
        
        .template-difficulty {
          padding: 8rpx 20rpx;
          border-radius: 20rpx;
          font-size: 24rpx;
          
          &.difficulty-easy {
            background: #e8f5e9;
            color: #4caf50;
          }
          
          &.difficulty-medium {
            background: #fff3e0;
            color: #ff9800;
          }
          
          &.difficulty-hard {
            background: #ffebee;
            color: #f44336;
          }
        }
        
        .meta-item {
          font-size: 24rpx;
          color: #666;
        }

        .like-btn {
          display: inline-flex;
          align-items: center;
          gap: 8rpx;
          padding: 6rpx 14rpx;
          border-radius: 20rpx;
          background: #f6f7fb;

          &.liked {
            background: #ffebee;
          }

          .like-icon {
            font-size: 26rpx;
          }

          .like-count {
            font-size: 24rpx;
            color: #666;
          }
        }
      }
    }
    
    .use-btn {
      padding: 16rpx 40rpx;
      background: linear-gradient(135deg, $primary-color 0%, $secondary-color 100%);
      color: white;
      border-radius: 32rpx;
      font-size: 26rpx;
      font-weight: bold;
    }
  }
}
</style>
