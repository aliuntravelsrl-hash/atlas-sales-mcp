const { z } = require("zod");
const { apiPostJson, getSupabaseAuthHeaders, wrapError, wrapResult } = require("../config");

function registerBuscarOfertasMarketing(server, config) {
  server.tool(
    "buscar_ofertas_marketing",
    "Busca ofertas activas de hoteles con stock real. Retorna precio, descuento, fechas disponibles con inventario por fecha, ocupación, condiciones y si acepta depósito. Usar cuando el cliente pregunta por ofertas, promociones o precios especiales.",
    {
      p_hotel_slug: z
        .string()
        .nullable()
        .default(null)
        .describe(
          "Slug del hotel para filtrar. null para buscar en todos los hoteles. Convertir nombre a slug: Occidental Caribe = occidental-caribe, Bahia Principe Grand Bavaro = bahia-principe-grand-bavaro"
        ),
      p_offer_type: z
        .string()
        .nullable()
        .default(null)
        .describe(
          "Tipo de oferta: last_minute (último minuto), flash_sale (relámpago), package (paquete), early_bird (anticipada), group (grupos). null para todos los tipos"
        ),
      p_limit: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .describe("Cantidad máxima de ofertas. Usar 3 para respuesta rápida, 5 default, 10 para listado completo"),
    },
    async ({ p_hotel_slug, p_offer_type, p_limit }) => {
      try {
        const data = await apiPostJson(
          `${config.supabaseUrl}/rest/v1/rpc/rpc_get_marketing_active_offers`,
          { p_hotel_slug, p_offer_type, p_limit },
          getSupabaseAuthHeaders(config)
        );
        return wrapResult(data);
      } catch (error) {
        return wrapError(error);
      }
    }
  );
}

module.exports = { registerBuscarOfertasMarketing };
