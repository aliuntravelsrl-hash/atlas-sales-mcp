const { z } = require("zod");
const { apiPostJson, buildHeaders, wrapError, wrapResult } = require("../config");

function registerObtenerGaleriaHotel(server, config) {
  server.tool(
    "obtener_galeria_hotel",
    "Obtiene galería visual y assets de un hotel para ventas y soporte comercial.",
    {
      hotel_slug: z.string().describe("Slug del hotel"),
      limit: z.number().int().min(1).max(20).default(8).describe("Cantidad máxima de imágenes"),
      include_captions: z.boolean().default(true).describe("Incluir captions si existen"),
    },
    async (params) => {
      try {
        const data = await apiPostJson(
          `${config.n8nWebhookBase}${config.hotelGalleryWebhookPath}`,
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

module.exports = { registerObtenerGaleriaHotel };
