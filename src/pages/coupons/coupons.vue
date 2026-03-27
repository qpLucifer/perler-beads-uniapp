<template>
  <view class="coupon-page">
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'mine' }" @tap="tab = 'mine'">我的优惠券</view>
      <view class="tab" :class="{ active: tab === 'center' }" @tap="tab = 'center'">领券中心</view>
    </view>

    <scroll-view class="content" scroll-y>
      <view v-if="loading" class="loading">加载中...</view>

      <view v-else-if="tab === 'mine'">
        <view v-if="myCoupons.length === 0" class="empty">暂无可用优惠券</view>
        <view v-for="item in myCoupons" :key="item.user_coupon_id || item.id" class="coupon-card mine">
          <view class="left">
            <text class="name">{{ item.name }}</text>
            <text class="desc">{{ item.description || '平台优惠券' }}</text>
            <text class="meta">满 {{ Number(item.min_amount || 0).toFixed(2) }} 可用</text>
          </view>
          <view class="right">
            <text class="label">减</text>
            <text class="amount">¥{{ Number(item.discount_value || 0).toFixed(2) }}</text>
          </view>
        </view>
      </view>

      <view v-else>
        <view v-if="centerCoupons.length === 0" class="empty">暂无可领取优惠券</view>
        <view v-for="item in centerCoupons" :key="item.id" class="coupon-card">
          <view class="left">
            <text class="name">{{ item.name }}</text>
            <text class="desc">{{ item.description || '平台优惠券' }}</text>
            <text class="meta">门槛 ¥{{ Number(item.min_amount || 0).toFixed(2) }}</text>
          </view>
          <view class="right">
            <text class="label">减</text>
            <text class="amount">¥{{ Number(item.discount_value || 0).toFixed(2) }}</text>
            <button
              class="claim-btn"
              :class="{ disabled: isClaimed(item.id) }"
              :disabled="isClaimed(item.id)"
              @tap="claim(item)"
            >
              {{ isClaimed(item.id) ? '已领取' : '立即领取' }}
            </button>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { getCoupons, getMyCoupons, claimCoupon } from '@/api'
import { APP_EVENTS, emitAppEvent, onAppEvent, offAppEvent } from '@/utils/events.js'

export default {
  data() {
    return {
      tab: 'mine',
      loading: false,
      myCoupons: [],
      centerCoupons: [],
      claimedCouponIds: []
    }
  },
  watch: {
    tab() {
      this.loadData()
    }
  },
  onShow() {
    this.loadData()
  },
  onLoad() {
    this.couponEventHandler = () => this.loadData()
    onAppEvent(APP_EVENTS.COUPON_UPDATED, this.couponEventHandler)
  },
  onUnload() {
    if (this.couponEventHandler) {
      offAppEvent(APP_EVENTS.COUPON_UPDATED, this.couponEventHandler)
      this.couponEventHandler = null
    }
  },
  methods: {
    decodeHtmlEntities(value) {
      return String(value || '')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
    },

    async loadData() {
      this.loading = true
      try {
        const myAll = await getMyCoupons()
        this.claimedCouponIds = myAll.success
          ? (myAll.data.coupons || []).map(i => i.id)
          : []

        if (this.tab === 'mine') {
          const res = await getMyCoupons('unused')
          this.myCoupons = res.success
            ? (res.data.coupons || []).map(c => ({
                ...c,
                description: this.decodeHtmlEntities(c.description || '')
              }))
            : []
        } else {
          const res = await getCoupons('active')
          this.centerCoupons = res.success
            ? (res.data.coupons || []).map(c => ({
                ...c,
                description: this.decodeHtmlEntities(c.description || '')
              }))
            : []
        }
      } catch (err) {
        console.error(err)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    isClaimed(couponId) {
      return this.claimedCouponIds.includes(couponId)
    },
    async claim(item) {
      if (this.isClaimed(item.id)) return
      try {
        const res = await claimCoupon(item.id)
        if (res.success) {
          uni.showToast({ title: '领取成功', icon: 'success' })
          emitAppEvent(APP_EVENTS.COUPON_UPDATED, { source: 'coupons' })
          this.loadData()
        } else {
          if ((res.message || '').includes('已经领取')) {
            this.claimedCouponIds = [...new Set([...this.claimedCouponIds, item.id])]
          }
          uni.showToast({ title: res.message || '领取失败', icon: 'none' })
        }
      } catch (err) {
        this.claimedCouponIds = [...new Set([...this.claimedCouponIds, item.id])]
        uni.showToast({ title: '领取失败', icon: 'none' })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.coupon-page { min-height: 100vh; background: #f6f7fb; }
.tabs { display: flex; background: #fff; padding: 20rpx; gap: 16rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx; border-radius: 12rpx; background: #f2f3f7; color: #666; font-size: 28rpx; }
.tab.active { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; font-weight: 600; }
.content { height: calc(100vh - 120rpx); padding: 20rpx; box-sizing: border-box; }
.loading, .empty { text-align: center; color: #999; font-size: 26rpx; padding: 80rpx 0; }
.coupon-card { display: flex; justify-content: space-between; background: #fff; border-radius: 18rpx; padding: 24rpx; margin-bottom: 18rpx; box-shadow: 0 4rpx 16rpx rgba(0,0,0,.05); }
.coupon-card.mine { border-left: 8rpx solid #667eea; }
.left { display: flex; flex-direction: column; gap: 8rpx; max-width: 70%; }
.name { font-size: 30rpx; font-weight: 700; color: #222; }
.desc, .meta { font-size: 24rpx; color: #888; }
.right { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; }
.label { font-size: 22rpx; color: #ff6b6b; }
.amount { font-size: 40rpx; color: #ff6b6b; font-weight: 700; line-height: 1; margin-bottom: 12rpx; }
.claim-btn { min-width: 140rpx; height: 56rpx; line-height: 56rpx; font-size: 24rpx; border-radius: 28rpx; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border: none; padding: 0 20rpx; }
.claim-btn.disabled { background: #c7cad7; color: #f8f9ff; }
</style>
