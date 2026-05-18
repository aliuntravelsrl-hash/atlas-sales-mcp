const { z } = require("zod");
const { apiPostJson, buildHeaders, wrapError, wrapResult } = require("../config");

function registerGenerarCotizacionPdf(server, config) {
  server.tool(
    "generar_cotizacion_pdf",
    "Genera cotización PDF y la envía al cliente por email. Usar solo después de confirmar disponibilidad.",
    {
      slug: z.string().describe("Slug del hotel"),
      nombre: z.string().describe("Nombre completo del cliente"),
      email: z.string().describe("Email del cliente"),
      check_in: z.string().describe("Check-in YYYY-MM-DD"),
      check_out: z.string().describe("Check-out YYYY-MM-DD"),
      habitacion: z.string().describe("Tipo de habitación"),
      regimen: z.string().default("Todo Incluido").describe("Régimen alimenticio"),
      pasajeros: z.number().int().min(1).default(2).describe("Número de pasajeros"),
      precio_total: z.number().positive().describe("Precio total USD"),
      moneda: z.string().default("USD").describe("Moneda: USD o DOP"),
    },
    async (params) => {
      try {
        const data = await apiPostJson(
          `${config.n8nWebhookBase}/webhook/aliun-cotizacion`,
          params,
          buildHeaders(config)
        );
        return wrapResult(data);
      } catch (error) {
        return wrapError(error);
      }
    }
  );
}

module.exports = { registerGenerarCotizacionPdf };
