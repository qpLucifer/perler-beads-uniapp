// API 配置
const API_BASE_URL = 'http://localhost:3000/api';

// 存储 token
let authToken = uni.getStorageSync('auth_token') || null;

// 设置 token
export function setToken(token) {
  authToken = token;
  if (token) {
    uni.setStorageSync('auth_token', token);
  } else {
    uni.removeStorageSync('auth_token');
  }
}

// 获取 token
export function getToken() {
  return authToken;
}

// 清除 token
export function clearToken() {
  setToken(null);
}

// 封装请求
function request(options) {
  const decodeHtmlEntities = (value) => {
    if (typeof value !== 'string') return value
    return value
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  const deepDecode = (input) => {
    if (Array.isArray(input)) return input.map(deepDecode)
    if (input && typeof input === 'object') {
      const out = {}
      Object.keys(input).forEach((k) => {
        out[k] = deepDecode(input[k])
      })
      return out
    }
    return decodeHtmlEntities(input)
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: options.url.startsWith('http') ? options.url : API_BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
      },
      timeout: Number(options.timeout) || 30000,
      success: (res) => {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 202) {
          resolve(deepDecode(res.data));
        } else if (res.statusCode === 401) {
          // Token 过期，清除并跳转登录
          clearToken();
          uni.showModal({
            title: '提示',
            content: '登录已过期，请重新登录',
            showCancel: false,
            success: () => {
              uni.navigateTo({ url: '/pages/login/login' });
            }
          });
          reject(new Error('未授权'));
        } else {
          reject(new Error(res.data.message || '请求失败'));
        }
      },
      fail: (err) => {
        console.error('请求错误:', err);
        reject(err);
      }
    });
  });
}

// ========== 认证接口 ==========

// 用户注册
export function register(data) {
  return request({
    url: '/auth/register',
    method: 'POST',
    data
  });
}

// 用户登录
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'POST',
    data
  });
}

// WeChat mini-program login
export function wechatLogin(data) {
  return request({
    url: '/auth/wechat-login',
    method: 'POST',
    data
  });
}

// 获取当前用户信息
export function getCurrentUser() {
  return request({
    url: '/auth/me',
    method: 'GET'
  });
}

// 更新用户信息
export function updateUser(data) {
  return request({
    url: '/auth/me',
    method: 'PUT',
    data
  });
}

// 获取协议文档
export function getLegalDoc(docKey) {
  return request({
    url: `/legal/${docKey}`,
    method: 'GET'
  });
}

// ========== 商品接口 ==========

// 获取商品列表
export function getProducts(category = null) {
  const params = { status: 1 };
  if (category) params.category = category;
  
  return request({
    url: '/products',
    method: 'GET',
    data: params
  });
}

// 获取商品详情
export function getProduct(id) {
  return request({
    url: `/products/${id}`,
    method: 'GET'
  });
}

// ========== 作品接口 ==========

// 获取作品列表
export function getArtworks(params = {}) {
  return request({
    url: '/artworks',
    method: 'GET',
    data: params
  });
}

// 获取作品详情
export function getArtwork(id) {
  return request({
    url: `/artworks/${id}`,
    method: 'GET'
  });
}

// 创建作品
export function createArtwork(data) {
  return request({
    url: '/artworks',
    method: 'POST',
    data
  });
}

// 删除作品
export function deleteArtwork(id) {
  return request({
    url: `/artworks/${id}`,
    method: 'DELETE'
  });
}

// ========== 模板接口 ==========

// 获取模板列表
export function getTemplates(params = {}) {
  return request({
    url: '/templates',
    method: 'GET',
    data: params
  });
}

// 点赞/取消点赞（toggle）
export function toggleTemplateLike(id) {
  return request({
    url: `/templates/${id}/like`,
    method: 'POST'
  })
}

// 使用一次（+1 使用次数）
export function markTemplateUsed(id) {
  return request({
    url: `/templates/${id}/use`,
    method: 'POST'
  })
}

// 创建模板
export function createTemplate(data) {
  return request({
    url: '/templates',
    method: 'POST',
    data
  });
}

// AI image -> template canvas_data
export function generateTemplateCanvasByAI(data) {
  return request({
    url: '/templates/ai-from-image',
    method: 'POST',
    data,
    timeout: 180000
  });
}

export function createTemplateAiJob(data) {
  return request({
    url: '/templates/ai-from-image/jobs',
    method: 'POST',
    data,
    timeout: 30000
  });
}

export function getTemplateAiJob(taskId) {
  return request({
    url: `/templates/ai-from-image/jobs/${taskId}`,
    method: 'GET',
    timeout: 30000
  });
}

// 删除模板
export function deleteTemplate(id) {
  return request({
    url: `/templates/${id}`,
    method: 'DELETE'
  });
}

// ========== 购物车接口 ==========

// 获取购物车
export function getCart() {
  return request({
    url: '/cart',
    method: 'GET'
  });
}

// 添加到购物车
export function addToCart(data) {
  return request({
    url: '/cart/items',
    method: 'POST',
    data
  });
}

// 更新购物车商品
export function updateCartItem(id, quantity) {
  return request({
    url: `/cart/items/${id}`,
    method: 'PUT',
    data: { quantity }
  });
}

// 删除购物车商品
export function removeFromCart(id) {
  return request({
    url: `/cart/items/${id}`,
    method: 'DELETE'
  });
}

// 清空购物车
export function clearCart() {
  return request({
    url: '/cart',
    method: 'DELETE'
  });
}

// ========== 订单接口 ==========

// 获取订单列表
export function getOrders(status = null) {
  const params = {};
  if (status) params.status = status;
  
  return request({
    url: '/orders',
    method: 'GET',
    data: params
  });
}

// 获取订单详情
export function getOrder(id) {
  return request({
    url: `/orders/${id}`,
    method: 'GET'
  });
}

// 创建订单
export function createOrder(data) {
  return request({
    url: '/orders',
    method: 'POST',
    data
  });
}

// 支付订单
export function payOrder(id) {
  return request({
    url: `/orders/${id}/pay`,
    method: 'POST'
  });
}

// 取消订单
export function cancelOrder(id) {
  return request({
    url: `/orders/${id}/cancel`,
    method: 'POST'
  });
}

// 确认收货
export function confirmOrder(id) {
  return request({
    url: `/orders/${id}/confirm`,
    method: 'POST'
  });
}

// ========== 收货地址接口 ==========

// 获取地址列表
export function getAddresses() {
  return request({
    url: '/addresses',
    method: 'GET'
  });
}

// 获取默认地址
export function getDefaultAddress() {
  return request({
    url: '/addresses/default',
    method: 'GET'
  });
}

// 添加地址
export function addAddress(data) {
  return request({
    url: '/addresses',
    method: 'POST',
    data
  });
}

// 更新地址
export function updateAddress(id, data) {
  return request({
    url: `/addresses/${id}`,
    method: 'PUT',
    data
  });
}

// 删除地址
export function deleteAddress(id) {
  return request({
    url: `/addresses/${id}`,
    method: 'DELETE'
  });
}

// ========== 拼豆配置接口 ==========

// 获取所有拼豆颜色
export function getBeadColors() {
  return request({
    url: '/beads/colors',
    method: 'GET'
  });
}

// 获取画布尺寸配置
export function getCanvasSizes() {
  return request({
    url: '/beads/canvas-sizes',
    method: 'GET'
  });
}

// ========== 优惠券接口 ==========

// 获取优惠券列表（模板表，管理端）
export function getCoupons(status = null) {
  const params = {};
  if (status) params.status = status;
  
  return request({
    url: '/coupons',
    method: 'GET',
    data: params
  });
}

// 当前用户已领取的优惠券
export function getMyCoupons(userStatus = null) {
  const params = {};
  if (userStatus) params.status = userStatus;
  return request({
    url: '/coupons/user/my',
    method: 'GET',
    data: params
  });
}

// 领取优惠券
export function claimCoupon(couponId) {
  return request({
    url: `/coupons/claim/${couponId}`,
    method: 'POST'
  });
}

// 使用优惠券
export function useCoupon(id, orderId) {
  return request({
    url: `/coupons/${id}/use`,
    method: 'POST',
    data: { orderId }
  });
}

// 退回优惠券
export function returnCoupon(id) {
  return request({
    url: `/coupons/${id}/return`,
    method: 'POST'
  });
}
