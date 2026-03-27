<template>
  <auth-shell
    icon="✨"
    title="创建账号"
    subtitle="开启你的拼豆创作之旅"
    :show-footer="false"
  >
    <view>
      <auth-input v-model="username" label="用户名" placeholder="请输入用户名" :trim="true" />
      <auth-input v-model="email" label="邮箱" placeholder="请输入邮箱" :trim="true" type="text" />
      <text v-if="email" class="hint" :class="emailValid ? 'hint-ok' : 'hint-error'">
        {{ emailValid ? '邮箱格式可用' : '邮箱格式不正确' }}
      </text>
      <auth-input v-model="password" label="密码" placeholder="请输入密码" type="password" />
      <text v-if="password" class="hint" :class="passwordStrengthClass">
        密码强度：{{ passwordStrength.text }}
      </text>
      <auth-input v-model="confirmPassword" label="确认密码" placeholder="请再次输入密码" type="password" />
      <text v-if="confirmPassword" class="hint" :class="confirmPasswordOk ? 'hint-ok' : 'hint-error'">
        {{ confirmPasswordOk ? '两次密码一致' : '两次密码不一致' }}
      </text>

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
        :text="loading ? '注册中...' : '注册'"
        :loading="loading"
        :disabled="!canSubmit"
        @tap="handleRegister"
      />

      <!-- #ifdef MP-WEIXIN -->
      <auth-button
        type="wechat"
        :text="wechatLoading ? '微信授权中...' : '微信一键注册/登录'"
        :loading="wechatLoading"
        :disabled="!agreed"
        @tap="handleWechatRegisterOrLogin"
      />
      <!-- #endif -->

      <view class="switch-line">
        <text class="switch-tip">已有账号？</text>
        <text class="switch-link" @tap="goToLogin">立即登录</text>
      </view>
    </view>
  </auth-shell>
</template>

<script>
import { userStore } from '@/stores/user.js'
import AuthShell from '@/components/auth/AuthShell.vue'
import AuthButton from '@/components/auth/AuthButton.vue'
import AuthInput from '@/components/auth/AuthInput.vue'
import { isEmailValid, getPasswordStrength } from '@/utils/useAuthForm.js'

export default {
  components: {
    AuthShell,
    AuthButton,
    AuthInput
  },
  data() {
    return {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreed: true,
      loading: false,
      wechatLoading: false
    }
  },
  computed: {
    emailValid() {
      return isEmailValid(this.email)
    },
    passwordStrength() {
      return getPasswordStrength(this.password)
    },
    passwordStrengthClass() {
      if (this.passwordStrength.level === 'strong') return 'hint-ok'
      if (this.passwordStrength.level === 'medium') return 'hint-warn'
      return 'hint-error'
    },
    confirmPasswordOk() {
      return this.password && this.confirmPassword && this.password === this.confirmPassword
    },
    canSubmit() {
      return (
        !!this.username &&
        !!this.email &&
        !!this.password &&
        !!this.confirmPassword &&
        this.emailValid &&
        this.password.length >= 6 &&
        this.confirmPasswordOk &&
        this.agreed &&
        !this.loading
      )
    }
  },

  methods: {
    async handleRegister() {
      if (!this.agreed) {
        uni.showToast({
          title: '请先同意用户协议与隐私政策',
          icon: 'none'
        })
        return
      }

      // 验证输入
      if (!this.username || !this.email || !this.password) {
        uni.showToast({
          title: '请填写完整信息',
          icon: 'none'
        })
        return
      }

      if (!this.emailValid) {
        uni.showToast({
          title: '请输入正确的邮箱地址',
          icon: 'none'
        })
        return
      }

      if (this.password !== this.confirmPassword) {
        uni.showToast({
          title: '两次输入的密码不一致',
          icon: 'none'
        })
        return
      }

      if (this.password.length < 6) {
        uni.showToast({
          title: '密码长度不能少于 6 位',
          icon: 'none'
        })
        return
      }

      this.loading = true

      try {
        const result = await userStore.register(this.username, this.email, this.password)
        
        if (result.success) {
          uni.showToast({
            title: '注册成功',
            icon: 'success'
          })

          // 延迟跳转到首页
          setTimeout(() => {
            uni.switchTab({
              url: '/pages/index/index'
            })
          }, 1000)
        } else {
          uni.showToast({
            title: result.message,
            icon: 'none'
          })
        }
      } catch (e) {
        uni.showToast({
          title: '注册失败，请稍后重试',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    goToLogin() {
      uni.navigateTo({
        url: '/pages/login/login'
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

    async handleWechatRegisterOrLogin() {
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
        if (!loginRes.code) throw new Error('微信登录 code 获取失败')

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
            title: result.isNewUser ? '注册成功，欢迎加入' : '登录成功',
            icon: 'success'
          })
          setTimeout(() => {
            uni.switchTab({
              url: '/pages/index/index'
            })
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
.hint {
  display: block;
  margin-top: -10rpx;
  margin-bottom: 14rpx;
  font-size: 22rpx;
}

.hint-ok {
  color: #1ea468;
}

.hint-warn {
  color: #cc8a13;
}

.hint-error {
  color: #d94848;
}

.agreement-row {
  display: flex;
  align-items: center;
  margin-top: 4rpx;
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
