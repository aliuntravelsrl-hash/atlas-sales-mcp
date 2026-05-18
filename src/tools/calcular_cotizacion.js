const { z } = require("zod");
const { apiPostJson, getSupabaseAuthHeaders, wrapError, wrapResult } = require("../config");

function registerCalcularCotizacion(server, config) {
  server.tool(
    "calcular_cotizacion",
    "Calcula una cotización formal para un hotel y fechas dadas. Usar después de confirmar hotel, fechas y ocupación del cliente.",
    {
      hotel_name: z.string().describe("Nombre del hotel"),
      check_in_date: z.string().describe("Fecha check-in formato YYYY-MM-DD"),
      check_out_date: z.string().describe("Fecha check-out formato YYYY-MM-DD"),
      num_adults: z.number().int().min(1).max(8).describe("Número de adultos"),
      num_children: z.number().int().min(0).max(6).default(0).describe("Número de niños (0 si no aplica)"),
    },
    async ({ hotel_name, check_in_date, check_out_date, num_adults, num_children }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/calcular_cotizacion`,
          {
            hotel_name_query: hotel_name,
            check_in: check_in_date,
            check_out: check_out_date,
            adults: num_adults,
            children: num_children,
          },
          getSupabaseAuthHeaders(config)
        );
        return wrapResult(data);
      } catch (error) {
        return wrapError(error);
      }
    }
  );
}

module.exports = { registerCalcularCotizacion };
