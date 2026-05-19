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
    version: '1.2.0'
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

// Session map: sessionId → transport
const transports = {}

// Parse JSON body from incoming request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch (err) { reject(err) }
    })
    req.on('error', reject)
  })
}

// HTTP server
const serverHttp = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'up', server: 'atlas-sales-tools', version: '1.2.0', activeSessions: Object.keys(transports).length }))
    return
  }

  // SSE stream for GET /mcp (client reconnects to listen for events)
  if (req.method === 'GET' && req.url === '/mcp') {
    const sessionId = req.headers['mcp-session-id']
    if (!sessionId || !transports[sessionId]) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID' }, id: null }))
      return
    }
    try {
      const transport = transports[sessionId]
      await transport.handleRequest(req, res)
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
      if (sessionId && transports[sessionId]) {
        const transport = transports[sessionId]
        await transport.handleRequest(req, res, body)
        return
      }

      // New session: initialize request
      if (!sessionId && isInitializeRequest(body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            console.log(`[MCP] Session initialized: ${sid}`)
            transports[sid] = transport
          }
        })

        // Clean up on close
        transport.onclose = () => {
          const sid = transport.sessionId
          if (sid && transports[sid]) {
            console.log(`[MCP] Session closed: ${sid}`)
            delete transports[sid]
          }
        }

        // Create a fresh server per session and connect
        const server = getServer()
        await server.connect(transport)
        await transport.handleRequest(req, res, body)
        return
      }

      // Invalid: no session + not initialization
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null
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
    if (!sessionId || !transports[sessionId]) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Invalid or missing session ID' }, id: null }))
      return
    }
    try {
      const transport = transports[sessionId]
      await transport.handleRequest(req, res)
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

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[ATLAS-SALES-MCP] Shutting down...')
  for (const sid in transports) {
    try { await transports[sid].close() } catch {}
    delete transports[sid]
  }
  process.exit(0)
})

serverHttp.listen(config.port, () => {
  console.log(`[ATLAS-SALES-MCP] v1.2.0 on :${config.port}`)
})
