import { z } from 'zod'
import { wrapError, wrapResult, getWebhookHeaders } from '../config.js'

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

        // Path del webhook de depósito configurable vía env.
        // Default mantiene el path actual de producción para no romper
        // el flujo existente; ajustar REGISTRAR_DEPOSITO_WEBHOOK_PATH en
        // EasyPanel cuando exista un workflow dedicado de depósitos.
        const path = config.registrarDepositoWebhookPath
        const response = await fetch(`${config.n8nWebhookBase}${path}`, {
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
