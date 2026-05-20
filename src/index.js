import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js'
import http from 'http'

// Config
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://oyihiyivdhfxpyiwnmqk.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  n8nWebhookBase: process.env.N8N_WEBHOOK_BASE || 'https://n8n-n8n.xaruuo.easypanel.host',
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

// Factory: creates a fresh McpServer with all tools registered
function getServer() {
  const server = new McpServer({
    name: 'atlas-sales-tools',
    version: '1.3.1'
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
    res.end(JSON.stringify({ status: 'up', server: 'atlas-sales-tools', version: '1.3.1', activeSessions: Object.keys(sessions).length }))
    return
  }

  // SSE stream for GET /mcp (stateful clients only)
  if (req.method === 'GET' && req.url === '/mcp') {
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

// Session cleanup: expire stateful sessions idle > 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const sid in sessions) {
    if (now - sessions[sid].lastSeen > 300_000) {
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
  console.log(`[ATLAS-SALES-MCP] v1.3.1 on :${config.port}`)
})
