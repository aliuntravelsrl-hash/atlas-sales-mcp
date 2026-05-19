import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import http from 'http'

// Config
const config = {
  supabaseUrl: process.env.SUPABASE_URL || 'https://oyihiyivdhfxpyiwnmqk.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  n8nWebhookBase: process.env.N8N_WEBHOOK_BASE || 'https://n8n-n8n.xaruuo.easypanel.host',
  port: parseInt(process.env.PORT || '3000', 10),
}

// MCP Server
const server = new McpServer({
  name: 'atlas-sales-tools',
  version: '1.2.0'
})

// Import and register all tools
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

// Register all tools
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

// HTTP server with health check + MCP endpoint
const serverHttp = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'up', server: 'atlas-sales-tools', version: '1.2.0' }))
    return
  }

  if (req.method === 'POST' && req.url === '/mcp') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
        await server.connect(transport)
        await transport.handleRequest(req, res, JSON.parse(body))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(err) }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

serverHttp.listen(config.port, () => {
  console.log(`[ATLAS-SALES-MCP] v1.2.0 on :${config.port}`)
})
