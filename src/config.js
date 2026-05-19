// ─── Supabase Auth Headers ──────────────────────────────────
export function getSupabaseAuthHeaders(config) {
  return {
    'apikey': config.supabaseAnonKey,
    'Authorization': `Bearer ${config.supabaseAnonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
}

// ─── Supabase REST API POST (for RPC calls) ────────────────
export async function apiPostJson(url, body, headers) {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response.json()
}

// ─── Supabase REST API GET ──────────────────────────────────
export async function apiGetJson(url, headers) {
  const response = await fetch(url, {
    method: 'GET',
    headers
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HTTP ${response.status}: ${text}`)
  }
  return response.json()
}

// ─── Response wrappers ──────────────────────────────────────
export function wrapResult(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data) }] }
}

export function wrapError(error) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: String(error.message || error) }) }] }
}
