export function isEmailValid(email) {
  const value = String(email || '').trim()
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function getPasswordStrength(password) {
  const value = String(password || '')
  let score = 0
  if (value.length >= 6) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  if (value.length >= 10) score += 1

  if (score <= 1) return { level: 'weak', text: '弱' }
  if (score <= 3) return { level: 'medium', text: '中' }
  return { level: 'strong', text: '强' }
}
