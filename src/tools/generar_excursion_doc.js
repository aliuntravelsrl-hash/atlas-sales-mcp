import { z } from 'zod'
import { wrapError, wrapResult, getWebhookHeaders } from '../config.js'

export function registrarGenerarExcursionDoc(server, config) {
  server.tool(
    'generar_excursion_doc',
    'Genera cotización, confirmación o voucher PDF para una reserva de excursión. Llama WF-EXCURSION-DOC-v1. Detecta moneda automáticamente: DO=DOP, US/PR/OTRA=USD. Incluye foto, descripción, incluye/excluye, qué llevar, mapa y política de cancelación desde Supabase.',
    {
      booking_ref:      z.string().describe('Referencia de la reserva (ej. EXC-001)'),
      excursion_slug:   z.string().describe('Slug de la excursión (ej. dolphin-island-park)'),
      plan_id:          z.string().describe('UUID del plan de la excursión'),
      tipo_documento:   z.enum(['COTIZACION','CONFIRMACION','VOUCHER']).describe('Tipo de documento a generar'),
      cliente_nombre:   z.string().describe('Nombre completo del cliente'),
      cliente_telefono: z.string().optional().describe('Teléfono del cliente'),
      fecha:            z.string().describe('Fecha de la excursión YYYY-MM-DD'),
      pax_adultos:      z.number().int().min(1).default(2).describe('Número de adultos'),
      pax_ninos:        z.number().int().min(0).default(0).describe('Número de niños'),
      nationality:      z.string().default('DO').describe('Código de nacionalidad: DO=DOP, US/PR/OTRA=USD'),
      total_dop:        z.number().describe('Precio total en DOP'),
      deposito_dop:     z.number().default(0).describe('Abono recibido en DOP'),
      saldo_dop:        z.number().optional().describe('Saldo pendiente en DOP (calculado si no se envía)'),
    },
    async ({ booking_ref, excursion_slug, plan_id, tipo_documento, cliente_nombre,
             cliente_telefono, fecha, pax_adultos, pax_ninos, nationality,
             total_dop, deposito_dop, saldo_dop }) => {
      try {
        const payload = {
          booking_ref,
          excursion_slug,
          plan_id,
          tipo_documento,
          cliente_nombre,
          cliente_telefono: cliente_telefono || '',
          fecha,
          pax_adultos,
          pax_ninos,
          nationality,
          total_dop,
          deposito_dop,
          saldo_dop: saldo_dop ?? (total_dop - deposito_dop),
        }

        const response = await fetch(
          `${config.n8nWebhookBase}/webhook/aliun-excursion-doc`,
          {
            method: 'POST',
            headers: getWebhookHeaders(config),
            body: JSON.stringify(payload),
          }
        )
        const result = await response.json()
        return wrapResult({
          pdf_url:  result.pdf_url,
          ref:      result.ref,
          tipo:     tipo_documento,
          message: `Documento ${tipo_documento} de excursión generado. PDF enviado a Telegram del Director.`,
        })
      } catch (err) {
        return wrapError(`Error generando documento de excursión: ${err.message}`)
      }
    }
  )
}
