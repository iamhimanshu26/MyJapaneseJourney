const GUEST_ID_KEY = 'my-japanese-journey-guest-id'

function getGuestId() {
  try {
    const existing = localStorage.getItem(GUEST_ID_KEY)
    if (existing) return existing
    const value = `guest:${crypto.randomUUID()}`
    localStorage.setItem(GUEST_ID_KEY, value)
    return value
  } catch {
    return `guest:fallback-${Date.now()}`
  }
}

export function getUserIdentity(user) {
  const authUserId = user?.id || getGuestId()
  return {
    authUserId,
    email: user?.email || null,
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
  }
}
