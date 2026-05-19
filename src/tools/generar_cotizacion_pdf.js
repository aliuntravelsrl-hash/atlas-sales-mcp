import { z } from 'zod'
import { getSupabaseAuthHeaders, wrapError, wrapResult } from '../config.js'

export function registrarGenerarCotizacionPdf(server, config) {
  server.tool(
    'generar_cotizacion_pdf',
    'Genera cotización PDF y la envía al cliente por email via n8n/Gotenberg. Usar solo después de confirmar disponibilidad.',
    {
      slug: z.string().describe('Slug del hotel'),
      nombre: z.string().describe('Nombre completo del cliente'),
      email: z.string().describe('Email del cliente'),
      check_in: z.string().describe('Check-in YYYY-MM-DD'),
      check_out: z.string().describe('Check-out YYYY-MM-DD'),
      habitacion: z.string().describe('Tipo de habitación'),
      regimen: z.string().default('Todo Incluido').describe('Régimen alimenticio'),
      pasajeros: z.number().int().min(1).default(2).describe('Número de pasajeros'),
      precio_total: z.number().describe('Precio total USD'),
      moneda: z.string().default('USD').describe('Moneda: USD o DOP'),
    },
    async ({ slug, nombre, email, check_in, check_out, habitacion, regimen, pasajeros, precio_total, moneda }) => {
      try {
        const response = await fetch(`${config.n8nWebhookBase}/webhook/wf-cotizacion-gotenberg-v2`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, nombre, email, check_in, check_out, habitacion, regimen, pasajeros, precio_total, moneda })
        })
        const result = await response.json()
        return wrapResult({ status: response.status, ...result })
      } catch (error) {
        return wrapError(error)
      }
    }
  )
}
