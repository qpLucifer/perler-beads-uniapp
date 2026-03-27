<template>
  <view class="field">
    <text class="field-label">{{ label }}</text>
    <input
      class="field-input"
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :maxlength="maxlength"
      @input="handleInput"
    />
  </view>
</template>

<script>
export default {
  name: 'AuthInput',
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    placeholder: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'text'
    },
    maxlength: {
      type: Number,
      default: 140
    },
    trim: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    handleInput(e) {
      const value = e?.detail?.value ?? ''
      this.$emit('update:modelValue', this.trim ? value.trim() : value)
    }
  }
}
</script>

<style lang="scss" scoped>
.field {
  margin-bottom: 24rpx;
}

.field-label {
  display: block;
  color: #293255;
  font-size: 26rpx;
  font-weight: 600;
  margin-bottom: 10rpx;
}

.field-input {
  height: 86rpx;
  background: #f4f7ff;
  border: 2rpx solid #e3e8ff;
  border-radius: 16rpx;
  padding: 0 22rpx;
  font-size: 27rpx;
  color: #1f2340;
  transition: all 0.22s ease;
}

.field-input:focus {
  border-color: #7d8dff;
  box-shadow: 0 0 0 6rpx rgba(96, 122, 255, 0.16);
  background: #ffffff;
}
</style>
