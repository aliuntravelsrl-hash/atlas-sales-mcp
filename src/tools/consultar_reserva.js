const { z } = require("zod");
const { apiPostJson, getSupabaseAuthHeaders, wrapError, wrapResult } = require("../config");

function registerConsultarReserva(server, config) {
  server.tool(
    "consultar_reserva",
    "Consulta el estado de una reserva existente por número de referencia o nombre del cliente. Retorna estado, fechas, hotel, monto pagado y saldo pendiente.",
    {
      search_term: z
        .string()
        .describe("Número de reserva (ej: ALN-12345) o nombre completo del titular. Ejemplo: ALN-00123 o Juan Pérez"),
    },
    async ({ search_term }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/consultar_reserva`,
          { search_term },
          getSupabaseAuthHeaders(config)
        );
        return wrapResult(data);
      } catch (error) {
        return wrapError(error);
      }
    }
  );
}

module.exports = { registerConsultarReserva };
