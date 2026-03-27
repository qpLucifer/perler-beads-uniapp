// 用户状态管理
import { login, register, wechatLogin, getCurrentUser, setToken, clearToken } from '@/api'

class UserStore {
  constructor() {
    this.user = null
    this.token = uni.getStorageSync('auth_token') || null
    this.isLoggedIn = !!this.token
    
    // 初始化时获取用户信息
    if (this.isLoggedIn) {
      this.fetchUser()
    }
  }

  // 获取用户信息
  async fetchUser() {
    try {
      const res = await getCurrentUser()
      if (res.success) {
        this.user = res.data.user
        this.isLoggedIn = true
      } else {
        this.logout()
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      this.logout()
    }
  }

  // 兼容 getUser 方法
  getUser() {
    return this.user
  }

  // 登录
  async login(username, password) {
    try {
      const res = await login({ username, password })
      
      if (res.success) {
        this.user = res.data.user
        this.token = res.data.token
        this.isLoggedIn = true
        
        // 保存 token
        setToken(res.data.token)
        
        return { success: true, user: res.data.user }
      } else {
        return { success: false, message: res.message || '登录失败' }
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, message: error.message || '网络错误，请稍后重试' }
    }
  }

  // 注册
  async register(username, email, password, nickname) {
    try {
      const res = await register({ username, email, password, nickname })
      
      if (res.success) {
        this.user = res.data.user
        this.token = res.data.token
        this.isLoggedIn = true
        
        // 保存 token
        setToken(res.data.token)
        
        return { success: true, user: res.data.user }
      } else {
        return { success: false, message: res.message || '注册失败' }
      }
    } catch (error) {
      console.error('注册失败:', error)
      return { success: false, message: error.message || '网络错误，请稍后重试' }
    }
  }

  // WeChat login
  async loginWithWechat(code, userInfo) {
    try {
      const res = await wechatLogin({ code, userInfo })
      if (res.success) {
        this.user = res.data.user
        this.token = res.data.token
        this.isLoggedIn = true
        setToken(res.data.token)
        return { success: true, user: res.data.user, isNewUser: !!res.data.isNewUser }
      }
      return { success: false, message: res.message || '微信登录失败' }
    } catch (error) {
      console.error('微信登录失败:', error)
      return { success: false, message: error.message || '网络错误，请稍后重试' }
    }
  }

  // 登出
  logout() {
    this.user = null
    this.token = null
    this.isLoggedIn = false
    
    // 清除 token
    clearToken()
  }

  // 检查是否已登录
  checkLogin() {
    if (!this.isLoggedIn) {
      uni.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return false
    }
    return true
  }
}

const userStore = new UserStore()

export { userStore }
export default userStore
