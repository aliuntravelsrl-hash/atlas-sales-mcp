const { z } = require("zod");
const { apiPostJson, buildHeaders, wrapError, wrapResult } = require("../config");

function registerValidarComprobante(server, config) {
  server.tool(
    "validar_comprobante",
    "Valida un comprobante de pago del cliente. Retorna si es válido y acción recomendada.",
    {
      booking_reference: z.string().describe("Referencia reserva ALN-XXXXX"),
      imagen_url: z.string().optional().describe("URL imagen del comprobante"),
      monto_reportado: z.number().positive().describe("Monto que el cliente reporta USD"),
      descripcion: z.string().optional().describe("Texto del cliente sobre el comprobante"),
    },
    async (params) => {
      try {
        const data = await apiPostJson(
          `${config.n8nWebhookBase}/webhook/validar-comprobante`,
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

module.exports = { registerValidarComprobante };
