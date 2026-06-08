import { z } from 'zod'
import { wrapError, wrapResult, getWebhookHeaders } from '../config.js'

export function registrarValidarComprobante(server, config) {
  server.tool(
    'validar_comprobante',
    'Valida un comprobante de pago del cliente. Retorna si es válido y acción recomendada.',
    {
      booking_reference: z.string().describe('Referencia reserva ALN-XXXXX'),
      monto_reportado: z.number().describe('Monto que el cliente reporta USD'),
      descripcion: z.string().optional().describe('Texto del cliente sobre el comprobante'),
      imagen_url: z.string().optional().describe('URL imagen del comprobante'),
    },
    async ({ booking_reference, monto_reportado, descripcion, imagen_url }) => {
      try {
        const payload = { booking_reference, monto_reportado }
        if (descripcion) payload.descripcion = descripcion
        if (imagen_url) payload.imagen_url = imagen_url

        const response = await fetch(`${config.n8nWebhookBase}/webhook/validar-comprobante`, {
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
