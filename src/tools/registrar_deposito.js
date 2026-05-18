const { z } = require("zod");
const { apiPostJson, buildHeaders, wrapError, wrapResult } = require("../config");

function registerRegistrarDeposito(server, config) {
  server.tool(
    "registrar_deposito",
    "Registra un depósito recibido y emite Estado de Cuenta PDF al cliente. Solo Director debe usar esta tool.",
    {
      booking_reference: z.string().describe("Referencia reserva ALN-XXXXX"),
      monto_deposito: z.number().positive().describe("Monto depósito USD"),
      metodo_pago: z.string().default("transferencia").describe("transferencia | efectivo | tarjeta"),
      email_cliente: z.string().describe("Email del cliente"),
      notas: z.string().optional().describe("Notas del depósito"),
    },
    async (params) => {
      try {
        const data = await apiPostJson(
          `${config.n8nWebhookBase}/webhook/aliun-deposito-aprobado`,
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

module.exports = { registerRegistrarDeposito };
