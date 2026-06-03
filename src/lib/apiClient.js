function getApiBase() {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

function buildHeaders(identity) {
  const headers = { 'Content-Type': 'application/json' }
  if (identity?.authUserId) headers['X-Auth-User-Id'] = identity.authUserId
  if (identity?.email) headers['X-User-Email'] = identity.email
  if (identity?.name) headers['X-User-Name'] = identity.name
  return headers
}

export async function apiRequest(path, { method = 'GET', identity, body } = {}) {
  const res = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: buildHeaders(identity),
    body: body ? JSON.stringify(body) : undefined,
  })

  let data = {}
  try {
    data = await res.json()
  } catch {
    data = {}
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`)
  }
  return data
}
