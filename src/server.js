const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { registerConsultarDisponibilidad } = require("./tools/consultar_disponibilidad");
const { registerBuscarHoteles } = require("./tools/buscar_hoteles");
const { registerGenerarCotizacionPdf } = require("./tools/generar_cotizacion_pdf");
const { registerRegistrarDeposito } = require("./tools/registrar_deposito");
const { registerValidarComprobante } = require("./tools/validar_comprobante");
const { registerObtenerGaleriaHotel } = require("./tools/obtener_galeria_hotel");
const { registerGenerarPostCreativo } = require("./tools/generar_post_creativo");

function buildServer(config) {
  const server = new McpServer({
    name: config.appName,
    version: config.version,
  });

  registerConsultarDisponibilidad(server, config);
  registerBuscarHoteles(server, config);
  registerGenerarCotizacionPdf(server, config);
  registerRegistrarDeposito(server, config);
  registerValidarComprobante(server, config);
  registerObtenerGaleriaHotel(server, config);
  registerGenerarPostCreativo(server, config);

  return server;
}

module.exports = { buildServer };
