const { z } = require("zod");
const { apiPostJson, getSupabaseAuthHeaders, wrapError, wrapResult } = require("../config");

function registerAnalisisFinanciero(server, config) {
  server.tool(
    "analisis_financiero",
    "Analiza opciones hoteleras o escenarios de viaje en función del presupuesto del cliente. Úsala para comparar valor, rango de precio y viabilidad.",
    {
      analysis_description: z
        .string()
        .describe("Qué quiere analizar el cliente. Ejemplo: comparar Barcelo Bavaro vs Riu Republica para 2 adultos 5 noches"),
      budget: z.number().min(0).default(0).describe("Presupuesto máximo en USD (0 si no especifica)"),
    },
    async ({ analysis_description, budget }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/analisis_financiero`,
          {
            analysis_query: analysis_description,
            budget_limit: budget,
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

module.exports = { registerAnalisisFinanciero };
