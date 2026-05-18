const { z } = require("zod");
const { apiPostJson, buildHeaders, wrapError, wrapResult } = require("../config");

function registerGenerarPostCreativo(server, config) {
  server.tool(
    "generar_post_creativo",
    "Genera copy/post creativo de marketing para un hotel, oferta o campaña puntual.",
    {
      hotel_slug: z.string().optional().describe("Slug del hotel si aplica"),
      offer_title: z.string().optional().describe("Título de la oferta"),
      audience: z.string().default("familias").describe("Audiencia objetivo"),
      channel: z.string().default("instagram").describe("Canal destino"),
      tone: z.string().default("premium-cercano").describe("Tono del copy"),
      cta: z.string().optional().describe("Call to action deseado"),
    },
    async (params) => {
      try {
        const data = await apiPostJson(
          `${config.n8nWebhookBase}${config.postCreativoWebhookPath}`,
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

module.exports = { registerGenerarPostCreativo };
