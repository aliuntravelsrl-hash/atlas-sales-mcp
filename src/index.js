import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import http from 'http'

// Config
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://oyihiyivdhfxpyiwnmqk.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  // Service-role key opt-in: solo se usa para escrituras si está presente.
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  n8nWebhookBase: process.env.N8N_WEBHOOK_BASE || 'https://n8n-n8n.xaruuo.easypanel.host',
  // Secreto compartido para firmar webhooks a n8n (opt-in).
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || '',
  // Token de auth del endpoint /mcp (opt-in): si está vacío el endpoint
  // queda abierto como hoy; si se define, exige header X-MCP-Auth.
  mcpAuthToken: process.env.MCP_AUTH_TOKEN || '',
  // TTL de sesiones stateful en ms (default 30 min).
  sessionTtlMs: parseInt(process.env.SESSION_TTL_MS || '1800000', 10),
  port: parseInt(process.env.PORT || '3000', 10),
}

// Import all tool register functions
import { registerConsultarDisponibilidad } from './tools/consultar_disponibilidad.js'
import { registerBuscarHoteles } from './tools/buscar_hoteles.js'
import { registrarGenerarCotizacionPdf } from './tools/generar_cotizacion_pdf.js'
import { registrarValidarComprobante } from './tools/validar_comprobante.js'
import { registerObtenerGaleriaHotel } from './tools/obtener_galeria_hotel.js'
import { registrarGenerarPostCreativo } from './tools/generar_post_creativo.js'
import { registrarCalcularCotizacion } from './tools/calcular_cotizacion.js'
import { registrarAnalisisFinanciero } from './tools/analisis_financiero.js'
import { registrarCalcularPrecioPaquete } from './tools/calcular_precio_paquete.js'
import { registrarValidarOcupacionHabitacion } from './tools/validar_ocupacion_habitacion.js'
import { registrarBuscarOfertasMarketing } from './tools/buscar_ofertas_marketing.js'
import { registrarConsultarReserva } from './tools/consultar_reserva.js'
import { registrarRegistrarDeposito } from './tools/registrar_deposito.js'
// CRM Pipeline Tools
import { registerRegistrarLead } from './tools/registrar_lead.js'
import { registerAvanzarPipeline } from './tools/avanzar_pipeline.js'
import { registerRegistrarActividad } from './tools/registrar_actividad.js'
import { registerCrearDeal } from './tools/crear_deal.js'
import { registerConsultarPipeline } from './tools/consultar_pipeline.js'
// Mission Control / Analytics Tools
import { registrarStalePayments } from './tools/stale_payments.js'
import { registrarGenerarExcursionDoc } from './tools/generar_excursion_doc.js'

// Factory: creates a fresh McpServer with all tools registered
function getServer() {
  const server = new McpServer({
    name: 'atlas-sales-tools',
    version: '1.4.0'
  })

  registerConsultarDisponibilidad(server, config)
  registerBuscarHoteles(server, config)
  registrarGenerarCotizacionPdf(server, config)
  registrarValidarComprobante(server, config)
  registerObtenerGaleriaHotel(server, config)
  registrarGenerarPostCreativo(server, config)
  registrarCalcularCotizacion(server, config)
  registrarAnalisisFinanciero(server, config)
  registrarCalcularPrecioPaquete(server, config)
  registrarValidarOcupacionHabitacion(server, config)
  registrarBuscarOfertasMarketing(server, config)
  registrarConsultarReserva(server, config)
  registrarRegistrarDeposito(server, config)

  // CRM Pipeline Tools
  registerRegistrarLead(server, config)
  registerAvanzarPipeline(server, config)
  registerRegistrarActividad(server, config)
  registerCrearDeal(server, config)
  registerConsultarPipeline(server, config)

  // Mission Control / Analytics Tools
  registrarStalePayments(server, config)
  registrarGenerarExcursionDoc(server, config)

  return server
}

// Session map for stateful clients: sessionId → { transport, server, lastSeen }
const sessions = {}

// Parse JSON body from incoming request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) }
      catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

// Auth gate opt-in para /mcp.
// Si config.mcpAuthToken está vacío → endpoint abierto (comportamiento
// actual, cero downtime). Si está definido → exige header X-MCP-Auth
// con el token. Devuelve true si la request está autorizada.
function isAuthorized(req) {
  if (!config.mcpAuthToken) return true
  const provided = req.headers['x-mcp-auth'] || req.headers['authorization']
  if (!provided) return false
  // Acepta el token directo o como "Bearer <token>".
  const token = provided.startsWith('Bearer ') ? provided.slice(7) : provided
  return token === config.mcpAuthToken
}

function sendUnauthorized(res, id = null) {
  res.writeHead(401, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32001, message: 'Unauthorized: invalid or missing X-MCP-Auth' }, id }))
}

// Handle stateless requests (no session management).
// Creates a one-shot server+transport that skips the MCP handshake.
// The SDK's validateSession is bypassed because sessionIdGenerator is undefined.
async function handleStatelessRequest(req, res, body) {
  console.log(`[MCP] Stateless request: ${body?.method} (id=${body?.id})`)

  // Create a SESSIONLESS transport — no sessionIdGenerator = no session validation
  const transport = new StreamableHTTPServerTransport({
    // No sessionIdGenerator → SDK skips all session checks
  })

  const server = getServer()
  await server.connect(transport)

  // Mark as initialized so the SDK accepts tool calls
  transport._initialized = true

  try {
    await transport.handleRequest(req, res, body)
  } finally {
    // Clean up immediately — this was a one-shot connection
    try { await transport.close() } catch {}
  }
}

// HTTP server
const serverHttp = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'up', server: 'atlas-sales-tools', version: '1.4.0', activeSessions: Object.keys(sessions).length }))
    return
  }

  // SSE stream for GET /mcp (stateful clients only)
  if (req.method === 'GET' && req.url === '/mcp') {
    if (!isAuthorized(req)) { sendUnauthorized(res); return }
    const sessionId = req.headers['mcp-session-id']
    if (!sessionId || !sessions[sessionId]) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID' }, id: null }))
      return
    }
    sessions[sessionId].lastSeen = Date.now()
    try {
      await sessions[sessionId].transport.handleRequest(req, res)
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(err) }))
      }
    }
    return
  }

  // MCP POST endpoint
  if (req.method === 'POST' && req.url === '/mcp') {
    if (!isAuthorized(req)) { sendUnauthorized(res); return }
    const sessionId = req.headers['mcp-session-id']

    try {
      const body = await parseBody(req)

      // PATH 1: Existing stateful session — reuse transport
      if (sessionId && sessions[sessionId]) {
        sessions[sessionId].lastSeen = Date.now()
        await sessions[sessionId].transport.handleRequest(req, res, body)
        return
      }

      // PATH 2: Standard MCP handshake — create stateful session
      if (!sessionId && isInitializeRequest(body)) {
        const sid = randomUUID()
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => sid,
          onsessioninitialized: (s) => { console.log(`[MCP] Session initialized: ${s}`) }
        })
        transport.onclose = () => {
          if (sessions[sid]) { console.log(`[MCP] Session closed: ${sid}`); delete sessions[sid] }
        }
        const server = getServer()
        await server.connect(transport)
        sessions[sid] = { transport, server, lastSeen: Date.now() }
        await transport.handleRequest(req, res, body)
        return
      }

      // PATH 3: No session + not initialize = STATELESS mode
      // Client (Atlas Tech, OpenClaw) sent tool call without handshake.
      // Process it on a one-shot sessionless transport.
      if (!sessionId) {
        await handleStatelessRequest(req, res, body)
        return
      }

      // Session ID provided but not found — expired
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Session expired or invalid. Re-initialize.' },
        id: body?.id || null
      }))
    } catch (err) {
      console.error('[MCP] Error:', err.message)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(err) }))
      }
    }
    return
  }

  // DELETE /mcp — session termination
  if (req.method === 'DELETE' && req.url === '/mcp') {
    if (!isAuthorized(req)) { sendUnauthorized(res); return }
    const sessionId = req.headers['mcp-session-id']
    if (!sessionId || !sessions[sessionId]) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid or missing session ID' }, id: null }))
      return
    }
    try {
      await sessions[sessionId].transport.handleRequest(req, res)
      delete sessions[sessionId]
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(err) }))
      }
    }
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

// Session cleanup: expire stateful sessions idle > SESSION_TTL_MS (default 30 min)
setInterval(() => {
  const now = Date.now()
  for (const sid in sessions) {
    if (now - sessions[sid].lastSeen > config.sessionTtlMs) {
      console.log(`[MCP] Session expired: ${sid}`)
      try { sessions[sid].transport.close() } catch {}
      delete sessions[sid]
    }
  }
}, 60_000)

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[ATLAS-SALES-MCP] Shutting down...')
  for (const sid in sessions) {
    try { await sessions[sid].transport.close() } catch {}
    delete sessions[sid]
  }
  process.exit(0)
})

serverHttp.listen(config.port, () => {
  console.log(`[ATLAS-SALES-MCP] v1.4.0 on :${config.port}`)
})
