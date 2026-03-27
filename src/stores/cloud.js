// 云端存储管理
import { 
  getArtworks, 
  createArtwork, 
  deleteArtwork,
  getTemplates,
  createTemplate,
  deleteTemplate,
  getOrders,
  createOrder,
  payOrder,
  cancelOrder,
  confirmOrder
} from '@/api'

class CloudStore {
  // 保存作品到云端
  async saveArtwork(artwork) {
    try {
      const res = await createArtwork({
        name: artwork.name,
        canvas_size: artwork.canvasSize?.width || 32,
        canvas_data: artwork.canvasData,
        bead_count: artwork.beadCount,
        price: artwork.price,
        is_public: artwork.is_public || 0
      })
      
      if (res.success) {
        return { success: true, artwork: res.data.artwork }
      } else {
        return { success: false, message: res.message || '保存失败' }
      }
    } catch (error) {
      console.error('保存作品失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 获取用户作品列表
  async getArtworks() {
    try {
      const res = await getArtworks({ is_public: 0 })
      if (res.success) {
        return { success: true, artworks: res.data.artworks }
      } else {
        return { success: false, message: res.message || '加载失败' }
      }
    } catch (error) {
      console.error('获取作品列表失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 删除作品
  async deleteArtwork(id) {
    try {
      const res = await deleteArtwork(id)
      if (res.success) {
        return { success: true }
      } else {
        return { success: false, message: res.message || '删除失败' }
      }
    } catch (error) {
      console.error('删除作品失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 上传模板
  async uploadTemplate(template) {
    try {
      const res = await createTemplate({
        name: template.name,
        category: template.category || '其他',
        difficulty: template.difficulty || '简单',
        canvas_size: template.canvasSize?.width || 32,
        canvas_data: template.canvasData
      })
      
      if (res.success) {
        return { success: true, template: res.data.template }
      } else {
        return { success: false, message: res.message || '上传失败' }
      }
    } catch (error) {
      console.error('上传模板失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 获取模板列表
  async getTemplates(params = {}) {
    try {
      const res = await getTemplates(params)
      if (res.success) {
        return { success: true, templates: res.data.templates }
      } else {
        return { success: false, message: res.message || '加载失败' }
      }
    } catch (error) {
      console.error('获取模板列表失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 删除模板
  async deleteTemplate(id) {
    try {
      const res = await deleteTemplate(id)
      if (res.success) {
        return { success: true }
      } else {
        return { success: false, message: res.message || '删除失败' }
      }
    } catch (error) {
      console.error('删除模板失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 创建订单
  async createOrder(orderData) {
    try {
      const res = await createOrder({
        items: orderData.items,
        address_id: orderData.address_id,
        coupon_id: orderData.coupon_id || undefined,
        remark: orderData.remark || ''
      })
      
      if (res.success) {
        return { success: true, order: res.data.order }
      } else {
        return { success: false, message: res.message || '创建订单失败' }
      }
    } catch (error) {
      console.error('创建订单失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 获取订单列表
  async getOrders(status = null) {
    try {
      const res = await getOrders(status)
      if (res.success) {
        return { success: true, orders: res.data.orders }
      } else {
        return { success: false, message: res.message || '加载失败' }
      }
    } catch (error) {
      console.error('获取订单列表失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 支付订单
  async payOrder(orderId) {
    try {
      const res = await payOrder(orderId)
      if (res.success) {
        return { success: true }
      } else {
        return { success: false, message: res.message || '支付失败' }
      }
    } catch (error) {
      console.error('支付订单失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 取消订单
  async cancelOrder(orderId) {
    try {
      const res = await cancelOrder(orderId)
      if (res.success) {
        return { success: true }
      } else {
        return { success: false, message: res.message || '取消失败' }
      }
    } catch (error) {
      console.error('取消订单失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }

  // 确认收货
  async confirmOrder(orderId) {
    try {
      const res = await confirmOrder(orderId)
      if (res.success) {
        return { success: true }
      } else {
        return { success: false, message: res.message || '确认收货失败' }
      }
    } catch (error) {
      console.error('确认收货失败:', error)
      return { success: false, message: '网络错误，请稍后重试' }
    }
  }
}

const cloudStore = new CloudStore()

export { cloudStore }
export default cloudStore
