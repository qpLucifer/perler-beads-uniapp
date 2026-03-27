<template>
  <button
    class="auth-btn"
    :class="[buttonClass, { 'is-disabled': isDisabled }]"
    :loading="loading"
    :disabled="isDisabled"
    @tap="handleTap"
  >
    {{ text }}
  </button>
</template>

<script>
export default {
  name: 'AuthButton',
  emits: ['tap'],
  props: {
    text: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'primary'
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    buttonClass() {
      return this.type === 'wechat' ? 'wechat-btn' : 'primary-btn'
    },
    isDisabled() {
      return this.loading || this.disabled
    }
  },
  methods: {
    handleTap() {
      if (this.isDisabled) return
      this.$emit('tap')
    }
  }
}
</script>

<style lang="scss" scoped>
.auth-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 16rpx;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 700;
  border: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;

  &::after {
    border: none;
  }
}

.primary-btn {
  margin-top: 8rpx;
  background: linear-gradient(135deg, #5f77ff 0%, #8d52ef 100%);
  box-shadow: 0 12rpx 24rpx rgba(94, 108, 255, 0.35);
}

.wechat-btn {
  margin-top: 18rpx;
  background: #18b566;
  box-shadow: 0 10rpx 22rpx rgba(24, 181, 102, 0.33);
}

.auth-btn:active {
  transform: scale(0.985);
  opacity: 0.96;
}

.is-disabled {
  opacity: 0.55;
  box-shadow: none;
}

.primary-btn:active {
  box-shadow: 0 6rpx 14rpx rgba(94, 108, 255, 0.28);
}

.wechat-btn:active {
  box-shadow: 0 6rpx 12rpx rgba(24, 181, 102, 0.26);
}
</style>
