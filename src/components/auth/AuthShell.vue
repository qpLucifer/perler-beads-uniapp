<template>
  <view class="auth-page">
    <view class="bg-glow bg-glow-left"></view>
    <view class="bg-glow bg-glow-right"></view>

    <view class="auth-header">
      <text class="brand-icon">{{ icon }}</text>
      <text class="brand-title">{{ title }}</text>
      <text class="brand-subtitle">{{ subtitle }}</text>
    </view>

    <view class="auth-card">
      <slot />
    </view>

    <view v-if="showFooter" class="auth-footer">
      <text>{{ footerText }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'AuthShell',
  props: {
    icon: {
      type: String,
      default: '🧩'
    },
    title: {
      type: String,
      default: '拼豆 DIY'
    },
    subtitle: {
      type: String,
      default: ''
    },
    showFooter: {
      type: Boolean,
      default: true
    },
    footerText: {
      type: String,
      default: '登录即代表同意《用户协议》与《隐私政策》'
    }
  }
}
</script>

<style lang="scss" scoped>
.auth-page {
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  padding: 88rpx 36rpx 48rpx;
  background: radial-gradient(circle at top, #2b3154 0%, #171b30 55%, #121526 100%);
}

.bg-glow {
  position: absolute;
  width: 380rpx;
  height: 380rpx;
  border-radius: 50%;
  filter: blur(24rpx);
  opacity: 0.34;
}

.bg-glow-left {
  top: -120rpx;
  left: -100rpx;
  background: #7b6dff;
  animation: floatGlowA 6.5s ease-in-out infinite;
}

.bg-glow-right {
  right: -120rpx;
  bottom: 120rpx;
  background: #2fd0a5;
  animation: floatGlowB 7.5s ease-in-out infinite;
}

.auth-header {
  position: relative;
  z-index: 2;
  text-align: center;
  margin-bottom: 52rpx;

  .brand-icon {
    font-size: 92rpx;
    display: block;
    margin-bottom: 16rpx;
  }

  .brand-title {
    display: block;
    font-size: 46rpx;
    color: #f4f7ff;
    font-weight: 700;
    letter-spacing: 2rpx;
  }

  .brand-subtitle {
    display: block;
    margin-top: 10rpx;
    font-size: 25rpx;
    color: rgba(233, 238, 255, 0.78);
  }
}

.auth-card {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(14rpx);
  border-radius: 28rpx;
  padding: 44rpx 30rpx 36rpx;
  box-shadow: 0 20rpx 44rpx rgba(4, 8, 24, 0.32);
  animation: cardBreath 5s ease-in-out infinite;
}

.auth-footer {
  position: relative;
  z-index: 2;
  text-align: center;
  margin-top: 36rpx;
  color: rgba(230, 236, 255, 0.76);
  font-size: 22rpx;
}

@keyframes floatGlowA {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(10rpx, 14rpx, 0);
  }
}

@keyframes floatGlowB {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(-12rpx, -14rpx, 0);
  }
}

@keyframes cardBreath {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5rpx);
  }
}
</style>
