const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { registerConsultarDisponibilidad } = require("./tools/consultar_disponibilidad");
const { registerBuscarHoteles } = require("./tools/buscar_hoteles");
const { registerGenerarCotizacionPdf } = require("./tools/generar_cotizacion_pdf");
const { registerRegistrarDeposito } = require("./tools/registrar_deposito");
const { registerValidarComprobante } = require("./tools/validar_comprobante");
const { registerObtenerGaleriaHotel } = require("./tools/obtener_galeria_hotel");
const { registerGenerarPostCreativo } = require("./tools/generar_post_creativo");
const { registerCalcularCotizacion } = require("./tools/calcular_cotizacion");
const { registerAnalisisFinanciero } = require("./tools/analisis_financiero");
const { registerCalcularPrecioPaquete } = require("./tools/calcular_precio_paquete");
const { registerValidarOcupacionHabitacion } = require("./tools/validar_ocupacion_habitacion");
const { registerBuscarOfertasMarketing } = require("./tools/buscar_ofertas_marketing");
const { registerConsultarReserva } = require("./tools/consultar_reserva");

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
  registerCalcularCotizacion(server, config);
  registerAnalisisFinanciero(server, config);
  registerCalcularPrecioPaquete(server, config);
  registerValidarOcupacionHabitacion(server, config);
  registerBuscarOfertasMarketing(server, config);
  registerConsultarReserva(server, config);

  return server;
}

module.exports = { buildServer };
