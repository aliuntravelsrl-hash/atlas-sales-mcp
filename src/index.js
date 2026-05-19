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
    version: '1.3.0'
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

// Session map: sessionId → { transport, server }
const sessions = {}

// Create a new session with server + transport
async function createSession() {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sid) => {
      console.log(`[MCP] Session initialized: ${sid}`)
    }
  })

  // Clean up on close
  transport.onclose = () => {
    const sid = transport.sessionId
    if (sid && sessions[sid]) {
      console.log(`[MCP] Session closed: ${sid}`)
      delete sessions[sid]
    }
  }

  const server = getServer()
  await server.connect(transport)

  const sid = transport.sessionId
  sessions[sid] = { transport, server, lastSeen: Date.now() }
  return { sid, transport }
}

// Parse JSON body from incoming request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}) }
      catch (err) { reject(err) })
    req.on('error', reject)
  })
}

// HTTP server
const serverHttp = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'up', server: 'atlas-sales-tools', version: '1.3.0', activeSessions: Object.keys(sessions).length }))
    return
  }

  // SSE stream for GET /mcp (client reconnects to listen for events)
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

      // Existing session: reuse transport
      if (sessionId && sessions[sessionId]) {
        sessions[sessionId].lastSeen = Date.now()
        await sessions[sessionId].transport.handleRequest(req, res, body)
        return
      }

      // New session: explicit initialize request
      if (!sessionId && isInitializeRequest(body)) {
        const { sid, transport } = await createSession()
        await transport.handleRequest(req, res, body)
        return
      }

      // AUTO-INIT: No session + not an initialize request
      // Client sent tools/call without handshake — auto-create session
      if (!sessionId) {
        console.log(`[MCP] Auto-init for request: ${body?.method || 'unknown'}`)
        const { sid, transport } = await createSession()

        // Send initialize response internally so the transport is ready
        const initRequest = {
          jsonrpc: '2.0',
          id: 0,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'auto-init-client', version: '1.0.0' }
          }
        }

        // Process the initialize silently, then the actual request
        // We use a fake response collector to absorb the init response
        const fakeRes = {
          writeHead: () => {},
          end: () => {},
          headersSent: false,
          setHeader: () => {}
        }
        await transport.handleRequest(req, fakeRes, initRequest)

        // Now process the real request with the real response
        await transport.handleRequest(req, res, body)
        return
      }

      // Session ID provided but not found — expired/invalid
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: Session expired or invalid. Please re-initialize.' },
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

  // Session termination: DELETE /mcp
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

// Session cleanup: expire sessions idle > 5 minutes
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
  console.log(`[ATLAS-SALES-MCP] v1.3.0 on :${config.port}`)
})
