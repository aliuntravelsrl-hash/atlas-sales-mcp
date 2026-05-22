import { z } from 'zod'
import { wrapError, wrapResult } from '../config.js'

export function registrarRegistrarDeposito(server, config) {
  server.tool(
    'registrar_deposito',
    'Registra un depósito recibido y emite Estado de Cuenta PDF al cliente. Solo Director debe usar esta tool.',
    {
      booking_reference: z.string().describe('Referencia reserva ALN-XXXXX'),
      monto_deposito: z.number().describe('Monto depósito USD'),
      email_cliente: z.string().describe('Email del cliente'),
      metodo_pago: z.string().default('transferencia').describe('transferencia | efectivo | tarjeta'),
      notas: z.string().optional().describe('Notas del depósito'),
    },
    async ({ booking_reference, monto_deposito, email_cliente, metodo_pago, notas }) => {
      try {
        const payload = { booking_reference, monto_deposito, email_cliente, metodo_pago }
        if (notas) payload.notas = notas

        const response = await fetch(`${config.n8nWebhookBase}/webhook/registrar-interes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
