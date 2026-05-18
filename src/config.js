const REQUIRED = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "N8N_WEBHOOK_BASE"];

function getConfig() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  return {
    appName: "atlas-sales-tools",
    version: process.env.APP_VERSION || "1.1.0",
    port: parseInt(process.env.PORT || "3000", 10),
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    n8nWebhookBase: process.env.N8N_WEBHOOK_BASE.replace(/\/$/, ""),
    n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || null,
    hotelGalleryWebhookPath: process.env.HOTEL_GALLERY_WEBHOOK_PATH || "/webhook/hotel-galeria",
    postCreativoWebhookPath: process.env.POST_CREATIVO_WEBHOOK_PATH || "/webhook/generar-post-creativo",
    buscarHotelesWebhookPath: process.env.BUSCAR_HOTELES_WEBHOOK_PATH || "/webhook/buscar-hoteles",
    sessionTtlMs: parseInt(process.env.SESSION_TTL_MS || String(30 * 60 * 1000), 10),
  };
}

function buildHeaders(config, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };
  if (config.n8nWebhookSecret) headers["X-Webhook-Secret"] = config.n8nWebhookSecret;
  return headers;
}

function getSupabaseAuthHeaders(config, extraHeaders = {}) {
  const key = config.supabaseServiceRoleKey || config.supabaseAnonKey;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
}

async function apiPostJson(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function wrapResult(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function wrapError(error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true,
  };
}

module.exports = {
  getConfig,
  buildHeaders,
  getSupabaseAuthHeaders,
  apiPostJson,
  wrapResult,
  wrapError,
};
