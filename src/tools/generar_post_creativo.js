import { z } from 'zod'
import { wrapError, wrapResult, getWebhookHeaders } from '../config.js'

export function registrarGenerarPostCreativo(server, config) {
  server.tool(
    'generar_post_creativo',
    'Genera caption, hashtags, historia (3 slides) y mensaje WhatsApp broadcast para un hotel. Usa n8n + Gemini.',
    {
      hotel_slug: z.string().describe('Slug del hotel'),
      channel: z.string().default('instagram').describe('Canal destino: instagram, whatsapp, facebook'),
      offer_id: z.string().optional().describe('ID de oferta si aplica'),
    },
    async ({ hotel_slug, channel, offer_id }) => {
      try {
        const payload = { hotel_slug, channel }
        if (offer_id) payload.offer_id = offer_id

        const response = await fetch(`${config.n8nWebhookBase}/webhook/mcp-generar-post-creativo`, {
          method: 'POST',
          headers: getWebhookHeaders(config),
          body: JSON.stringify(payload)
        })
        const result = await response.json()
        return wrapResult({ status: response.status, ...result })
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
