<template>
  <auth-shell
    icon="🧩"
    title="拼豆 DIY"
    subtitle="欢迎回来，继续你的创作"
  >
    <view>
      <auth-input v-model="username" label="用户名" placeholder="请输入用户名" :trim="true" />
      <auth-input v-model="password" label="密码" placeholder="请输入密码" type="password" />

      <view class="agreement-row" @tap="agreed = !agreed">
        <text class="agree-icon">{{ agreed ? '☑' : '☐' }}</text>
        <view class="agree-text">
          <text>我已阅读并同意</text>
          <text class="link" @tap.stop="openAgreement">《用户协议》</text>
          <text>与</text>
          <text class="link" @tap.stop="openPrivacy">《隐私政策》</text>
        </view>
      </view>

      <auth-button
        :text="loading ? '登录中...' : '账号密码登录'"
        :loading="loading"
        :disabled="!canSubmit"
        @tap="handleLogin"
      />

      <!-- #ifdef MP-WEIXIN -->
      <auth-button
        type="wechat"
        :text="wechatLoading ? '微信授权中...' : '微信一键登录'"
        :loading="wechatLoading"
        :disabled="!agreed"
        @tap="handleWechatLogin"
      />
      <!-- #endif -->

      <view class="switch-line">
        <text class="switch-tip">还没有账号？</text>
        <text class="switch-link" @tap="goToRegister">立即注册</text>
      </view>
    </view>
  </auth-shell>
</template>

<script>
import { userStore } from '@/stores/user.js'
import AuthShell from '@/components/auth/AuthShell.vue'
import AuthButton from '@/components/auth/AuthButton.vue'
import AuthInput from '@/components/auth/AuthInput.vue'

export default {
  components: {
    AuthShell,
    AuthButton,
    AuthInput
  },
  data() {
    return {
      username: '',
      password: '',
      agreed: true,
      loading: false,
      wechatLoading: false
    }
  },
  computed: {
    canSubmit() {
      return !!this.username && !!this.password && this.agreed && !this.loading
    }
  },

  methods: {
    async handleLogin() {
      if (!this.agreed) {
        uni.showToast({
          title: '请先同意用户协议与隐私政策',
          icon: 'none'
        })
        return
      }

      if (!this.username || !this.password) {
        uni.showToast({
          title: '请填写用户名和密码',
          icon: 'none'
        })
        return
      }
      this.loading = true

      try {
        const result = await userStore.login(this.username, this.password)
        
        if (result.success) {
          uni.showToast({
            title: '登录成功',
            icon: 'success'
          })

          // 延迟跳转，让用户看到成功提示
          setTimeout(() => {
            uni.navigateBack()
          }, 1000)
        } else {
          uni.showToast({
            title: result.message,
            icon: 'none'
          })
        }
      } catch (e) {
        uni.showToast({
          title: '登录失败，请稍后重试',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    goToRegister() {
      uni.navigateTo({
        url: '/pages/register/register'
      })
    },
    openAgreement() {
      uni.navigateTo({
        url: '/pages/legal/user-agreement'
      })
    },
    openPrivacy() {
      uni.navigateTo({
        url: '/pages/legal/privacy-policy'
      })
    },

    async handleWechatLogin() {
      // #ifndef MP-WEIXIN
      uni.showToast({
        title: '请在微信小程序中使用',
        icon: 'none'
      })
      return
      // #endif

      this.wechatLoading = true
      try {
        const loginRes = await new Promise((resolve, reject) => {
          uni.login({
            provider: 'weixin',
            success: resolve,
            fail: reject
          })
        })

        if (!loginRes.code) {
          throw new Error('微信登录 code 获取失败')
        }

        const profileRes = await new Promise((resolve, reject) => {
          uni.getUserProfile({
            desc: '用于完善会员资料',
            success: resolve,
            fail: reject
          })
        })

        const result = await userStore.loginWithWechat(loginRes.code, profileRes.userInfo || {})
        if (result.success) {
          uni.showToast({
            title: result.isNewUser ? '欢迎加入拼豆 DIY' : '登录成功',
            icon: 'success'
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 800)
        } else {
          uni.showToast({
            title: result.message || '微信登录失败',
            icon: 'none'
          })
        }
      } catch (e) {
        const text = /deny|cancel/i.test(e?.errMsg || '') ? '你已取消授权' : '微信登录失败，请稍后重试'
        uni.showToast({
          title: text,
          icon: 'none'
        })
      } finally {
        this.wechatLoading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.agreement-row {
  display: flex;
  align-items: center;
  margin-top: 6rpx;
  margin-bottom: 8rpx;
}

.agree-icon {
  color: #5a70ff;
  font-size: 30rpx;
}

.agree-text {
  margin-left: 8rpx;
  color: #556083;
  font-size: 24rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.link {
  color: #4f63ff;
  margin: 0 4rpx;
}

.switch-line {
  text-align: center;
  margin-top: 30rpx;

  .switch-tip {
    color: #5a6388;
    font-size: 26rpx;
  }

  .switch-link {
    margin-left: 6rpx;
    color: #4f63ff;
    font-size: 26rpx;
    font-weight: 600;
  }
}
</style>
