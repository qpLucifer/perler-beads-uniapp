<template>
  <view class="address-page">
    <view v-if="!isLoggedIn" class="empty-state not-logged">
      <text class="empty-icon">🔐</text>
      <text class="empty-text">请先登录后管理收货地址</text>
      <button class="add-btn" @tap="goLogin">去登录</button>
    </view>

    <view v-else-if="addresses.length === 0" class="empty-state">
      <text class="empty-icon">🏠</text>
      <text class="empty-text">还没有收货地址</text>
      <button class="add-btn" @tap="showAddForm">添加新地址</button>
    </view>

    <view v-else class="address-list">
      <view 
        v-for="addr in addresses" 
        :key="addr.id" 
        class="address-item"
        :class="{ default: addr.is_default }"
        @tap="selectAddress(addr)">
        
        <view class="address-header">
          <view class="user-info">
            <text class="name">{{ addr.name }}</text>
            <text class="phone">{{ addr.phone }}</text>
          </view>
          <view v-if="addr.is_default" class="default-tag">默认</view>
        </view>
        
        <view class="address-detail">
          <text>{{ addr.province }}{{ addr.city }}{{ addr.district }}{{ addr.detail }}</text>
        </view>
        
        <view class="address-actions">
          <view class="action-btn" @tap.stop="editAddress(addr)">
            <text class="icon">✏️</text>
            <text>编辑</text>
          </view>
          <view class="action-btn" @tap.stop="handleDeleteAddress(addr)">
            <text class="icon">🗑️</text>
            <text>删除</text>
          </view>
          <view v-if="!addr.is_default" class="action-btn" @tap.stop="setDefault(addr)">
            <text class="icon">✓</text>
            <text>设为默认</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加/编辑地址表单 -->
    <view v-if="showForm" class="form-overlay" @tap="closeForm">
      <view class="form-container" @tap.stop>
        <view class="form-header">
          <text class="form-title">{{ isEditing ? '编辑地址' : '新增地址' }}</text>
          <text class="form-close" @tap="closeForm">✕</text>
        </view>
        
        <scroll-view class="form-content" scroll-y>
          <view class="form-group">
            <text class="form-label">收货人 <text class="required">*</text></text>
            <input 
              class="form-input"
              v-model="formData.name"
              placeholder="请输入收货人姓名"
              maxlength="20"
            />
          </view>
          
          <view class="form-group">
            <text class="form-label">手机号 <text class="required">*</text></text>
            <input 
              class="form-input"
              v-model="formData.phone"
              type="number"
              placeholder="请输入手机号码"
              maxlength="11"
            />
          </view>
          
          <view class="form-group">
            <text class="form-label">所在地区 <text class="required">*</text></text>
            <picker 
              mode="region"
              :value="[formData.province, formData.city, formData.district]"
              @change="onRegionChange">
              <view class="form-picker">
                <text v-if="!formData.province">请选择省/市/区</text>
                <text v-else>{{ formData.province }} {{ formData.city }} {{ formData.district }}</text>
              </view>
            </picker>
          </view>
          
          <view class="form-group">
            <text class="form-label">详细地址 <text class="required">*</text></text>
            <textarea 
              class="form-textarea"
              v-model="formData.detail"
              placeholder="街道、楼牌号等"
              maxlength="100"
            />
          </view>
          
          <view class="form-group checkbox-group">
            <view class="checkbox" :class="{ checked: formData.is_default }" @tap="toggleDefault">
              <text v-if="formData.is_default" class="check">✓</text>
            </view>
            <text class="checkbox-label">设为默认地址</text>
          </view>
        </scroll-view>
        
        <view class="form-actions">
          <button class="cancel-btn" @tap="closeForm">取消</button>
          <button class="submit-btn" @tap="submitForm" :disabled="!canSubmit">保存地址</button>
        </view>
      </view>
    </view>

    <view v-if="isLoggedIn && addresses.length > 0" class="bottom-add-bar">
      <button class="bottom-add-btn" @tap="showAddForm">＋ 新增地址</button>
    </view>
  </view>
</template>

<script>
import { userStore } from '@/stores/user.js'
import {
  getAddresses as fetchAddressList,
  addAddress as createAddressRequest,
  updateAddress as updateAddressRequest,
  deleteAddress as removeAddressRequest
} from '@/api'
import { APP_EVENTS, emitAppEvent } from '@/utils/events.js'

export default {
  data() {
    return {
      isLoggedIn: false,
      addresses: [],
      showForm: false,
      isEditing: false,
      editingId: null,
      formData: {
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        is_default: 0
      }
    }
  },

  computed: {
    canSubmit() {
      return this.formData.name && this.formData.phone && 
             this.formData.province && this.formData.detail
    }
  },

  onShow() {
    this.isLoggedIn = userStore.isLoggedIn
    if (this.isLoggedIn) {
      this.loadAddresses()
    } else {
      this.addresses = []
    }
  },

  methods: {
    goLogin() {
      uni.navigateTo({ url: '/pages/login/login' })
    },

    // 加载地址列表
    async loadAddresses() {
      try {
        const res = await fetchAddressList()
        if (res.success && res.data.addresses) {
          this.addresses = res.data.addresses
        }
      } catch (error) {
        console.error('加载地址失败:', error)
        uni.showToast({ title: '加载地址失败', icon: 'none' })
      }
    },

    // 选择地址
    selectAddress(addr) {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        const prev = pages[pages.length - 2]
        if (prev.route === 'pages/order/confirm') {
          try {
            uni.setStorageSync('checkout_pick_address', JSON.stringify(addr))
          } catch (e) {
            console.error(e)
          }
        }
      }
      uni.navigateBack()
    },

    // 打开添加表单
    showAddForm() {
      this.isEditing = false
      this.editingId = null
      this.formData = {
        name: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        is_default: 0
      }
      this.showForm = true
    },

    // 编辑地址
    editAddress(addr) {
      this.isEditing = true
      this.editingId = addr.id
      this.formData = {
        name: addr.name,
        phone: addr.phone,
        province: addr.province,
        city: addr.city,
        district: addr.district,
        detail: addr.detail,
        is_default: addr.is_default ? 1 : 0
      }
      this.showForm = true
    },

    // 删除地址
    handleDeleteAddress(addr) {
      uni.showModal({
        title: '删除地址',
        content: '确定要删除该地址吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const result = await removeAddressRequest(addr.id)
              if (result.success) {
                uni.showToast({ title: '删除成功', icon: 'success' })
                await this.loadAddresses()
                emitAppEvent(APP_EVENTS.ADDRESS_UPDATED, { source: 'address' })
              } else {
                uni.showToast({ title: result.message, icon: 'none' })
              }
            } catch (error) {
              uni.showToast({ title: '删除失败', icon: 'none' })
            }
          }
        }
      })
    },

    // 设为默认
    async setDefault(addr) {
      try {
        const result = await updateAddressRequest(addr.id, { is_default: 1 })
        if (result.success) {
          uni.showToast({ title: '已设为默认', icon: 'success' })
          await this.loadAddresses()
          emitAppEvent(APP_EVENTS.ADDRESS_UPDATED, { source: 'address' })
        }
      } catch (error) {
        uni.showToast({ title: '设置失败', icon: 'none' })
      }
    },

    // 地区选择
    onRegionChange(e) {
      const [province, city, district] = e.detail.value
      this.formData.province = province
      this.formData.city = city
      this.formData.district = district
    },

    // 切换默认
    toggleDefault() {
      this.formData.is_default = this.formData.is_default ? 0 : 1
    },

    // 关闭表单
    closeForm() {
      this.showForm = false
    },

    // 提交表单
    async submitForm() {
      if (!this.canSubmit) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' })
        return
      }

      uni.showLoading({ title: '保存中...' })

      try {
        const submitData = {
          name: this.formData.name,
          phone: this.formData.phone,
          province: this.formData.province,
          city: this.formData.city,
          district: this.formData.district,
          detail: this.formData.detail,
          is_default: this.formData.is_default
        }

        let result
        if (this.isEditing) {
          result = await updateAddressRequest(this.editingId, submitData)
        } else {
          result = await createAddressRequest(submitData)
        }

        uni.hideLoading()

        if (result.success) {
          uni.showToast({ title: '保存成功', icon: 'success' })
          this.showForm = false
          await this.loadAddresses()
          emitAppEvent(APP_EVENTS.ADDRESS_UPDATED, { source: 'address' })
        } else {
          uni.showToast({ title: result.message, icon: 'none' })
        }
      } catch (error) {
        uni.hideLoading()
        uni.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
$primary: #667eea;
$secondary: #764ba2;

.address-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 40rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  
  .empty-icon {
    font-size: 120rpx;
    margin-bottom: 30rpx;
  }
  
  .empty-text {
    font-size: 28rpx;
    color: #999;
    margin-bottom: 60rpx;
  }
  
  .add-btn {
    padding: 24rpx 60rpx;
    background: linear-gradient(135deg, $primary, $secondary);
    color: #fff;
    border-radius: 50rpx;
    font-size: 28rpx;
    border: none;
  }
}

/* Bottom add when list non-empty */
.bottom-add-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20rpx 30rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
  z-index: 50;

  .bottom-add-btn {
    width: 100%;
    height: 88rpx;
    line-height: 88rpx;
    background: linear-gradient(135deg, $primary, $secondary);
    color: #fff;
    border-radius: 44rpx;
    font-size: 30rpx;
    font-weight: bold;
    border: none;
  }
}

.address-list {
  padding: 24rpx;
  padding-bottom: 180rpx;
  
  .address-item {
    background: #fff;
    border-radius: 20rpx;
    padding: 30rpx;
    margin-bottom: 20rpx;
    border: 3rpx solid transparent;
    
    &.default {
      border-color: $primary;
      background: linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%);
    }
    
    .address-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16rpx;
      
      .user-info {
        display: flex;
        gap: 20rpx;
        
        .name {
          font-size: 32rpx;
          font-weight: bold;
          color: #333;
        }
        
        .phone {
          font-size: 28rpx;
          color: #666;
        }
      }
      
      .default-tag {
        background: linear-gradient(135deg, $primary, $secondary);
        color: #fff;
        font-size: 20rpx;
        padding: 6rpx 16rpx;
        border-radius: 20rpx;
      }
    }
    
    .address-detail {
      font-size: 26rpx;
      color: #666;
      line-height: 1.8;
      margin-bottom: 20rpx;
    }
    
    .address-actions {
      display: flex;
      gap: 24rpx;
      padding-top: 20rpx;
      border-top: 1rpx solid #f0f0f0;
      
      .action-btn {
        display: flex;
        align-items: center;
        gap: 8rpx;
        font-size: 24rpx;
        color: #666;
        padding: 8rpx 16rpx;
        background: #f8f9fa;
        border-radius: 12rpx;
        
        .icon {
          font-size: 28rpx;
        }
      }
    }
  }
}

/* 表单弹窗 */
.form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  
  .form-container {
    width: 100%;
    background: #fff;
    border-radius: 32rpx 32rpx 0 0;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    
    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 30rpx;
      border-bottom: 1rpx solid #f0f0f0;
      
      .form-title {
        font-size: 32rpx;
        font-weight: bold;
        color: #333;
      }
      
      .form-close {
        font-size: 40rpx;
        color: #999;
        padding: 10rpx;
      }
    }
    
    .form-content {
      flex: 1;
      padding: 30rpx;
    }
    
    .form-group {
      margin-bottom: 30rpx;
      
      .form-label {
        display: block;
        font-size: 28rpx;
        color: #333;
        margin-bottom: 16rpx;
        
        .required {
          color: #ff4d4f;
        }
      }
      
      .form-input,
      .form-textarea,
      .form-picker {
        width: 100%;
        padding: 20rpx 24rpx;
        background: #f8f9fa;
        border-radius: 12rpx;
        font-size: 28rpx;
        color: #333;
        border: 2rpx solid transparent;
        
        &:focus {
          background: #fff;
          border-color: $primary;
        }
      }
      
      .form-picker {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .form-textarea {
        min-height: 160rpx;
        line-height: 1.6;
      }
      
      .checkbox-group {
        display: flex;
        align-items: center;
        gap: 12rpx;
        
        .checkbox {
          width: 44rpx;
          height: 44rpx;
          border: 3rpx solid #ddd;
          border-radius: 8rpx;
          display: flex;
          align-items: center;
          justify-content: center;
          
          &.checked {
            background: $primary;
            border-color: $primary;
            
            .check {
              color: #fff;
              font-size: 28rpx;
              font-weight: bold;
            }
          }
        }
        
        .checkbox-label {
          font-size: 28rpx;
          color: #666;
        }
      }
    }
    
    .submit-btn {
      height: 88rpx;
      background: linear-gradient(135deg, $primary, $secondary);
      color: #fff;
      border-radius: 44rpx;
      font-size: 32rpx;
      font-weight: bold;
      border: none;
      
      &:disabled {
        background: #ccc;
        color: #999;
      }
    }

    .form-actions {
      display: flex;
      gap: 20rpx;
      padding: 20rpx 30rpx;
      border-top: 1rpx solid #f0f0f0;
      background: #fff;
      padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
    }

    .cancel-btn {
      flex: 1;
      height: 88rpx;
      border-radius: 44rpx;
      font-size: 30rpx;
      color: #666;
      background: #f1f3f8;
      border: none;
    }

    .submit-btn {
      flex: 1;
    }
  }
}
</style>
