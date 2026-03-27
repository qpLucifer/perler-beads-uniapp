export const APP_EVENTS = {
  CART_UPDATED: 'app:cart-updated',
  ORDER_UPDATED: 'app:order-updated',
  ARTWORK_UPDATED: 'app:artwork-updated',
  ADDRESS_UPDATED: 'app:address-updated',
  COUPON_UPDATED: 'app:coupon-updated'
}

export function emitAppEvent(name, payload = {}) {
  uni.$emit(name, payload)
}

export function onAppEvent(name, handler) {
  uni.$on(name, handler)
}

export function offAppEvent(name, handler) {
  uni.$off(name, handler)
}
