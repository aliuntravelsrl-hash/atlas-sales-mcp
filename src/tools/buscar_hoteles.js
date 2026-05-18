const { z } = require("zod");
const { apiPostJson, buildHeaders, getSupabaseAuthHeaders, wrapError, wrapResult } = require("../config");

function buildPayload(params) {
  return {
    p_destination: params.destination,
    p_check_in: params.check_in,
    p_check_out: params.check_out,
    p_adults: params.adults,
    p_children: params.children,
    p_category_min: params.category_min,
    p_category_max: params.category_max,
    p_max_price: params.max_price,
    p_amenities: params.amenities,
    p_limit: params.limit,
  };
}

function registerBuscarHoteles(server, config) {
  server.tool(
    "buscar_hoteles",
    "Busca hoteles con filtros estructurados. Usa RPC Supabase si existe; si falla, usa fallback webhook n8n.",
    {
      destination: z.string().describe("Destino o zona, ej: punta cana"),
      check_in: z.string().describe("Fecha entrada YYYY-MM-DD"),
      check_out: z.string().describe("Fecha salida YYYY-MM-DD"),
      adults: z.number().int().min(1).max(8).default(2).describe("Adultos"),
      children: z.number().int().min(0).max(6).default(0).describe("Niños"),
      category_min: z.number().int().min(1).max(5).optional().describe("Categoría mínima"),
      category_max: z.number().int().min(1).max(5).optional().describe("Categoría máxima"),
      max_price: z.number().positive().optional().describe("Precio máximo"),
      amenities: z.array(z.string()).default([]).describe("Amenidades requeridas"),
      limit: z.number().int().min(1).max(20).default(5).describe("Límite de resultados"),
    },
    async (params) => {
      try {
        const rpcData = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/buscar_hoteles`,
          buildPayload(params),
          getSupabaseAuthHeaders(config)
        );
        return wrapResult({ source: "supabase_rpc", data: rpcData });
      } catch (rpcError) {
        try {
          const webhookData = await apiPostJson(
            `${config.n8nWebhookBase}${config.buscarHotelesWebhookPath}`,
            params,
            buildHeaders(config)
          );
          return wrapResult({ source: "n8n_webhook_fallback", data: webhookData, fallback_reason: rpcError.message });
        } catch (webhookError) {
          return wrapError(new Error(`RPC error: ${rpcError.message} | Webhook fallback error: ${webhookError.message}`));
        }
      }
    }
  );
}

module.exports = { registerBuscarHoteles };
