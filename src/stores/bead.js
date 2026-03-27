// 简单的状态管理（不依赖 Pinia）
import { getTemplates, getProducts, getBeadColors, getCanvasSizes } from '@/api'

class BeadStore {
  constructor() {
    // 默认数据（API 失败时使用）
    this.colors = []
    this.canvasSizes = []
    this.selectedColor = null
    this.canvasSize = { width: 32, height: 32 }
    this.canvasData = []
    this.cart = []
    
    // 从 API 加载的数据
    this.templates = []
    this.products = []
    this.templatesLoaded = false
    this.productsLoaded = false
    this.colorsLoaded = false
    this.sizesLoaded = false
    
    // 从 API 加载数据
    this.loadBeadColors()
    this.loadCanvasSizes()
    this.loadTemplates()
    this.loadProducts()
    
    this.initCanvas()
  }
  
  // 从 API 加载拼豆颜色
  async loadBeadColors() {
    if (this.colorsLoaded) return
    
    try {
      const res = await getBeadColors()
      if (res.success && res.data.colors) {
        this.colors = res.data.colors
        this.selectedColor = this.colors[0]
        this.colorsLoaded = true
        console.log('✅ 拼豆颜色加载成功:', this.colors.length, '种')
      }
    } catch (error) {
      console.error('❌ 加载拼豆颜色失败:', error)
      this.loadDefaultColors()
    }
  }
  
  // 从 API 加载画布尺寸
  async loadCanvasSizes() {
    if (this.sizesLoaded) return
    
    try {
      const res = await getCanvasSizes()
      if (res.success && res.data.sizes) {
        this.canvasSizes = res.data.sizes
        const defaultSize = this.canvasSizes.find(s => s.recommended) || this.canvasSizes[1]
        if (defaultSize) {
          this.canvasSize = { width: defaultSize.width, height: defaultSize.height }
        }
        this.sizesLoaded = true
        console.log('✅ 画布尺寸加载成功:', this.canvasSizes.length, '种')
      }
    } catch (error) {
      console.error('❌ 加载画布尺寸失败:', error)
      this.canvasSizes = [
        { id: 1, name: '小号', width: 16, height: 16 },
        { id: 2, name: '标准', width: 32, height: 32, recommended: true },
        { id: 3, name: '大号', width: 48, height: 48 },
        { id: 4, name: '超大', width: 64, height: 64 }
      ]
      this.canvasSize = { width: 32, height: 32 }
      this.sizesLoaded = true
    }
  }
  
  // 从 API 加载模板
  async loadTemplates() {
    if (this.templatesLoaded) return
    
    try {
      // Template conversion depends on bead colors (to map cell.color -> hex).
      // Ensure colors are ready before converting templates.
      if (!this.colorsLoaded) {
        await this.loadBeadColors()
      }

      const res = await getTemplates()
      if (res.success && res.data.templates) {
        // 将后端数据转换为小程序格式
        this.templates = res.data.templates.map(t => {
          let beadData = t.bead_data
          if (typeof beadData === 'string') {
            try { beadData = JSON.parse(beadData) } catch(e) { beadData = { cells: [] } }
          }
          
          // 从 bead_data 生成 canvasData（二维数组格式）
          let canvasData = this.beadDataToCanvas(beadData)
          const size = t.width || 32
          const nonEmpty = Array.isArray(canvasData) && canvasData.some(row => row.some(cell => !!cell))
          if (!nonEmpty) {
            canvasData = this.generateFallbackCanvasByName(t.name, size)
          }
          
          // 提取缩略图 emoji
          const emoji = t.name.match(/[❤️⭐🔴🔵🟩🟣🐾🎬✨]/) ? t.name.match(/[❤️⭐🔴🔵🟩🟣🐾🎬✨]/)[0] : '🎨'
          
          return {
            id: t.id,
            name: t.name.replace(/[❤️⭐🔴🔵🟩🟣]/, '').trim(),
            thumbnail: emoji,
            difficulty: '简单',
            downloads: t.download_count || 0,
            category: '图案',
            canvasSize: { width: t.width || 32, height: t.height || 32 },
            canvasData: canvasData
          }
        })
        this.templatesLoaded = true
        console.log('✅ 模板加载成功:', this.templates.length, '个')
      }
    } catch (error) {
      console.error('❌ 加载模板失败:', error)
      // 如果 API 失败，使用本地默认数据
      this.loadDefaultTemplates()
    }
  }
  
  // 从 API 加载商品
  async loadProducts() {
    if (this.productsLoaded) return
    
    try {
      const res = await getProducts()
      if (res.success && res.data.products) {
        this.products = res.data.products.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price),
          category: p.category,
          emoji: this.getCategoryEmoji(p.category),
          stock: p.stock
        }))
        this.productsLoaded = true
        console.log('✅ 商品加载成功:', this.products.length, '个')
      }
    } catch (error) {
      console.error('❌ 加载商品失败:', error)
      // 如果 API 失败，使用本地默认数据
      this.loadDefaultProducts()
    }
  }
  
  // 默认颜色数据（API 失败时使用）
  loadDefaultColors() {
    this.colors = [
      { id: 1, name: '白色', hex: '#FFFFFF', price: 0.1, category: 'basic' },
      { id: 2, name: '黑色', hex: '#000000', price: 0.1, category: 'basic' },
      { id: 3, name: '红色', hex: '#FF0000', price: 0.1, category: 'basic' },
      { id: 4, name: '橙色', hex: '#FFA500', price: 0.1, category: 'basic' },
      { id: 5, name: '黄色', hex: '#FFFF00', price: 0.1, category: 'basic' },
      { id: 6, name: '绿色', hex: '#00FF00', price: 0.1, category: 'basic' },
      { id: 7, name: '蓝色', hex: '#0000FF', price: 0.1, category: 'basic' },
      { id: 8, name: '紫色', hex: '#8000FF', price: 0.1, category: 'basic' },
      { id: 9, name: '粉色', hex: '#FFC0CB', price: 0.1, category: 'basic' },
      { id: 10, name: '棕色', hex: '#8B4513', price: 0.1, category: 'basic' },
      { id: 11, name: '灰色', hex: '#808080', price: 0.1, category: 'basic' },
      { id: 12, name: '青色', hex: '#00FFFF', price: 0.1, category: 'basic' },
      { id: 13, name: '深蓝', hex: '#00008B', price: 0.15, category: 'special' },
      { id: 14, name: '深绿', hex: '#006400', price: 0.15, category: 'special' },
      { id: 15, name: '金色', hex: '#FFD700', price: 0.2, category: 'special' },
      { id: 16, name: '银色', hex: '#C0C0C0', price: 0.2, category: 'special' },
      { id: 17, name: '透明', hex: '#E0E0E0', price: 0.1, category: 'special' },
      { id: 18, name: '荧光红', hex: '#FF1493', price: 0.15, category: 'neon' },
      { id: 19, name: '荧光绿', hex: '#00FF7F', price: 0.15, category: 'neon' },
      { id: 20, name: '荧光蓝', hex: '#1E90FF', price: 0.15, category: 'neon' }
    ]
    this.selectedColor = this.colors[0]
    this.colorsLoaded = true
    console.log('⚠️ 使用默认颜色数据')
  }
  
  // 分类 emoji 映射
  getCategoryEmoji(category) {
    const map = {
      'set': '🎨',
      'board': '⬜',
      'tool': '🔌',
      'bead': '✨'
    }
    return map[category] || '📦'
  }
  
  // 从 bead_data JSON 转换为 canvasData 二维数组
  beadDataToCanvas(beadData) {
    if (!beadData) {
      return Array.from({ length: 32 }, () => Array(32).fill(null))
    }

    // Already in 2D array format
    if (Array.isArray(beadData) && Array.isArray(beadData[0])) {
      return beadData
    }

    const width = beadData.width || 32
    const height = beadData.height || 32
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
          // Official templates store English keywords (pink/gold/red...),
          // while bead colors are Chinese names. Normalize aliases before matching.
          const aliasMap = {
            pink: '粉色',
            gold: '金色',
            red: '红色',
            blue: '蓝色',
            green: '绿色',
            purple: '紫色'
          }

          const rawColor = String(cell.color ?? '')
          const normalizedName = aliasMap[rawColor.toLowerCase()] || cell.color
          const normalizedId = String(cell.color ?? '')

          const colorInfo = this.colors.find(c => c.name === normalizedName || String(c.id) === normalizedId)
          if (colorInfo) canvas[cell.row][cell.col] = { ...colorInfo }
        }
      })
    }
    
    return canvas
  }

  generateFallbackCanvasByName(name, size = 32) {
    const n = String(name || '')
    const canvas = Array.from({ length: size }, () => Array(size).fill(null))
    const put = (x, y, hex) => {
      if (y >= 0 && y < size && x >= 0 && x < size) {
        canvas[y][x] = { id: 'fallback', name: 'fallback', hex, price: 0.1 }
      }
    }

    const fillCircle = (hex) => {
      const cx = size / 2
      const cy = size / 2
      const r = size / 2.3
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - cx
          const dy = y - cy
          if (Math.sqrt(dx * dx + dy * dy) <= r) put(x, y, hex)
        }
      }
    }

    const fillSquare = (hex) => {
      const m = 2
      for (let y = m; y < size - m; y++) {
        for (let x = m; x < size - m; x++) put(x, y, hex)
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
          if (heart <= 0) put(x, y, hex)
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
          if (d < starR * 0.9) put(x, y, hex)
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
  
  // 默认模板数据（API 失败时使用）
  loadDefaultTemplates() {
    const generateHeart = (size = 32) => {
      const canvas = []
      const centerX = size / 2
      const centerY = size / 2 - 2
      for (let y = 0; y < size; y++) {
        const row = []
        for (let x = 0; x < size; x++) {
          const dx = (x - centerX) / (size / 8)
          const dy = (y - centerY) / (size / 8)
          const heart = Math.pow(dx * dx + dy * dy - 1, 3) - dx * dx * dy * dy * dy
          if (heart <= 0) {
            row.push({ id: 9, name: '粉色', hex: '#FFC0CB', price: 0.1 })
          } else {
            row.push(null)
          }
        }
        canvas.push(row)
      }
      return canvas
    }
    
    const generateStar = (size = 32) => {
      const canvas = []
      const centerX = size / 2
      const centerY = size / 2
      const outerR = size / 2.2
      const innerR = size / 4.5
      for (let y = 0; y < size; y++) {
        const row = []
        for (let x = 0; x < size; x++) {
          const dx = x - centerX
          const dy = y - centerY
          const distance = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx)
          const starR = (angle % (Math.PI / 5)) < (Math.PI / 10) ? innerR : outerR
          if (distance < starR * 0.9) {
            row.push({ id: 15, name: '金色', hex: '#FFD700', price: 0.2 })
          } else {
            row.push(null)
          }
        }
        canvas.push(row)
      }
      return canvas
    }
    
    const generateCircle = (size = 32, colorId = 5) => {
      const canvas = []
      const centerX = size / 2
      const centerY = size / 2
      const radius = size / 2.3
      const color = this.colors.find(c => c.id === colorId) || this.colors[4]
      for (let y = 0; y < size; y++) {
        const row = []
        for (let x = 0; x < size; x++) {
          const dx = x - centerX
          const dy = y - centerY
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance < radius) {
            row.push({ ...color })
          } else {
            row.push(null)
          }
        }
        canvas.push(row)
      }
      return canvas
    }
    
    const generateSquare = (size = 32, colorId = 7) => {
      const canvas = []
      const margin = 2
      const color = this.colors.find(c => c.id === colorId) || this.colors[6]
      for (let y = 0; y < size; y++) {
        const row = []
        for (let x = 0; x < size; x++) {
          if (x >= margin && x < size - margin && y >= margin && y < size - margin) {
            row.push({ ...color })
          } else {
            row.push(null)
          }
        }
        canvas.push(row)
      }
      return canvas
    }

    this.templates = [
      { id: 1, name: '心形', thumbnail: '❤️', difficulty: '简单', downloads: 2300, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: generateHeart(32) },
      { id: 2, name: '星星', thumbnail: '⭐', difficulty: '简单', downloads: 1890, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: generateStar(32) },
      { id: 3, name: '红色圆形', thumbnail: '🔴', difficulty: '简单', downloads: 1520, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: generateCircle(32, 3) },
      { id: 4, name: '蓝色圆形', thumbnail: '🔵', difficulty: '简单', downloads: 1280, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: generateCircle(32, 7) },
      { id: 5, name: '绿色方块', thumbnail: '🟩', difficulty: '简单', downloads: 1150, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: generateSquare(32, 6) },
      { id: 6, name: '紫色圆形', thumbnail: '🟣', difficulty: '简单', downloads: 980, category: '图案', canvasSize: { width: 32, height: 32 }, canvasData: generateCircle(32, 8) }
    ]
    this.templatesLoaded = true
    console.log('⚠️ 使用默认模板数据')
  }
  
  // 默认商品数据（API 失败时使用）
  loadDefaultProducts() {
    this.products = [
      { id: 1, name: '基础拼豆套装', description: '包含 20 种颜色，每种 100 颗', price: 39.9, category: '套装', emoji: '🎨', stock: 50 },
      { id: 2, name: '32x32 透明底板', description: '大号透明底板，适合复杂作品', price: 15.9, category: '底板', emoji: '⬜', stock: 100 },
      { id: 3, name: '专业熨斗', description: '恒温控制，安全易用', price: 45.0, category: '工具', emoji: '🔌', stock: 30 },
      { id: 4, name: '夜光拼豆', description: '特殊夜光效果，10 色混合', price: 29.9, category: '拼豆', emoji: '✨', stock: 8 },
      { id: 5, name: '金属色拼豆', description: '金银铜三色，高级质感', price: 25.9, category: '拼豆', emoji: '🌟', stock: 25 },
      { id: 6, name: '迷你底板套装', description: '6 个迷你底板，适合小作品', price: 19.9, category: '底板', emoji: '◻️', stock: 60 }
    ]
    this.productsLoaded = true
    console.log('⚠️ 使用默认商品数据')
  }

  initCanvas() {
    this.canvasData = []
    for (let y = 0; y < this.canvasSize.height; y++) {
      const row = []
      for (let x = 0; x < this.canvasSize.width; x++) {
        row.push(null)
      }
      this.canvasData.push(row)
    }
  }

  setColor(color) {
    this.selectedColor = color
  }

  setCell(x, y) {
    if (y >= 0 && y < this.canvasSize.height && x >= 0 && x < this.canvasSize.width) {
      if (!this.canvasData[y][x]) {
        this.canvasData[y][x] = { ...this.selectedColor }
      } else if (this.canvasData[y][x].id === this.selectedColor.id) {
        this.canvasData[y][x] = null
      } else {
        this.canvasData[y][x] = { ...this.selectedColor }
      }
      return true
    }
    return false
  }

  clearCanvas() {
    this.canvasData = []
    for (let y = 0; y < this.canvasSize.height; y++) {
      const row = []
      for (let x = 0; x < this.canvasSize.width; x++) {
        row.push(null)
      }
      this.canvasData.push(row)
    }
  }

  loadFromData(canvasData) {
    if (Array.isArray(canvasData) && canvasData.length > 0) {
      this.canvasData = canvasData
      this.canvasSize = {
        width: canvasData[0]?.length || 32,
        height: canvasData.length || 32
      }
    }
  }

  addToCart(product) {
    const existing = this.cart.find(item => item.id === product.id)
    if (existing) {
      existing.quantity += 1
    } else {
      this.cart.push({ ...product, quantity: 1 })
    }
    this.saveCart()
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.id !== productId)
    this.saveCart()
  }

  updateQuantity(productId, quantity) {
    const item = this.cart.find(item => item.id === productId)
    if (item) {
      item.quantity = Math.max(1, quantity)
      this.saveCart()
    }
  }

  clearCart() {
    this.cart = []
    this.saveCart()
  }

  getCartTotal() {
    return this.cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  saveCart() {
    try {
      uni.setStorageSync('cart_items', JSON.stringify(this.cart))
    } catch (e) {
      console.error('保存购物车失败:', e)
    }
  }

  loadCart() {
    try {
      const cartData = uni.getStorageSync('cart_items')
      if (cartData) {
        this.cart = JSON.parse(cartData)
      }
    } catch (e) {
      console.error('加载购物车失败:', e)
    }
  }

  // 添加作品到购物车（特殊处理）
  addArtworkToCart(artworkData) {
    const artworkItem = {
      id: 'artwork_' + Date.now(),
      artwork: {
        id: artworkData.artworkId,
        name: artworkData.name,
        canvasData: artworkData.canvasData
      },
      product: null,
      price: artworkData.price,
      quantity: 1,
      type: 'artwork'
    }
    this.cart.push(artworkItem)
    this.saveCart()
    return { success: true }
  }

  async forceReloadTemplates() {
    this.templatesLoaded = false
    await this.loadTemplates()
  }

  async forceReloadProducts() {
    this.productsLoaded = false
    await this.loadProducts()
  }
}

// 创建单例
const store = new BeadStore()

// 导出默认对象和命名导出
const beadStore = {
  colors: store.colors,
  selectedColor: store.selectedColor,
  canvasSize: store.canvasSize,
  canvasData: store.canvasData,
  cart: store.cart,
  templates: store.templates,
  products: store.products,
  templatesLoaded: store.templatesLoaded,
  productsLoaded: store.productsLoaded,
  setColor: (color) => store.setColor(color),
  setCell: (x, y) => store.setCell(x, y),
  clearCanvas: () => store.clearCanvas(),
  loadFromData: (data) => store.loadFromData(data),
  addToCart: (product) => store.addToCart(product),
  removeFromCart: (productId) => store.removeFromCart(productId),
  updateQuantity: (productId, qty) => store.updateQuantity(productId, qty),
  clearCart: () => store.clearCart(),
  getCartTotal: () => store.getCartTotal(),
  getCartCount: () => store.cart.reduce((sum, item) => sum + item.quantity, 0),
  addArtworkToCart: (data) => store.addArtworkToCart(data),
  loadCart: () => store.loadCart(),
  // 重新加载数据的方法
  reloadTemplates: () => store.forceReloadTemplates(),
  reloadProducts: () => store.forceReloadProducts()
}

export default beadStore
export { beadStore }
