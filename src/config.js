// ─── Supabase Auth Headers ──────────────────────────────────
// Por defecto usa la anon key (lecturas y RPCs públicas).
// Para operaciones de ESCRITURA pasar { write: true }: si existe
// SUPABASE_SERVICE_ROLE_KEY se usa esa key (bypassa RLS de forma
// controlada en el servidor); si no está configurada, cae a anon
// sin romper — comportamiento opt-in, cero downtime.
export function getSupabaseAuthHeaders(config, { write = false } = {}) {
  const key = (write && config.supabaseServiceRoleKey)
    ? config.supabaseServiceRoleKey
    : config.supabaseAnonKey
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
}

// ─── Webhook Headers (firma compartida opcional) ────────────
// Si N8N_WEBHOOK_SECRET está configurado, añade el header
// X-Webhook-Secret para que n8n pueda validar el origen.
// Si no está configurado, no añade nada — opt-in, cero downtime.
export function getWebhookHeaders(config, extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra }
  if (config.n8nWebhookSecret) {
    headers['X-Webhook-Secret'] = config.n8nWebhookSecret
  }
  return headers
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
