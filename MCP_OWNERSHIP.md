# MCP Tool Ownership Matrix

## 19 Tools → 4 Agents

### Hermes Ops ⚡ (Centro Nervioso)
- `consultar_pipeline` — metrics for Director reports
- `registrar_deposito` — **SOLO Director via Hermes Ops** (financial). v1.4.0: RPC Supabase directa `registrar_deposito(p_booking_ref, p_monto, p_metodo, p_notas)`. NO emite voucher (paso separado: Liberar Voucher)
- `stale_payments` — Mission Control: pagos `pending_review` estancados > p_hours (default 24). RPC de solo lectura `stale_payments(p_hours)`. También usada por Ariadne en el briefing 08:00

### Hermes Commercial 💰 (Ventas / WhatsApp — "Alex")
- `registrar_lead` — NEW client → CRM
- `avanzar_pipeline` — lead progresses (nuevo→cotizado→confirmada)
- `registrar_actividad` — log interaction notes
- `crear_deal` — lead wants to book → formal deal
- `consultar_disponibilidad` — check hotel rates for client
- `calcular_cotizacion` — formal quote for client
- `generar_cotizacion_pdf` — branded landing + PDF for client
- `calcular_precio_paquete` — pricing with USD/DOP conversion
- `validar_ocupacion_habitacion` — room capacity check before quoting
- `consultar_reserva` — check existing booking status
- `validar_comprobante` — registra comprobante de pago. v1.4.0: RPC Supabase directa `validar_comprobante(p_booking_ref, p_evidence_url, p_notes)` → `atlas_payments` status=`pending_review`. NO confirma ni emite PDF
- `obtener_galeria_hotel` — hotel images to share with client

### Hermes Marketing 📢 (Generación de Demanda)
- `buscar_hoteles` — search catalog for campaigns
- `buscar_ofertas_marketing` — active offers for promotions
- `generar_post_creativo` — captions + hashtags + broadcast messages
- `analisis_financiero` — budget analysis for campaign targeting

### Ariadne Data 🧠 (Inteligencia / Análisis — uses Supabase RPCs directly)
- `consultar_pipeline` — same tool, but Ariadne uses for analytics
- `stale_payments` — para el daily briefing 08:00 (alerta de comprobantes sin confirmar por el Director)
- Note: Ariadne primarily uses 7 RPCs (funnel_conversion, funnel_velocity, revenue_by_period, revenue_by_hotel, margin_analysis, stale_leads, segment_summary) — MCP tools are secondary

## Precedence Rules
1. `registrar_deposito` = **Director ONLY** — no agent executes without Director approval
2. Commercial tools = Hermes Commercial owns them, but Ops can call if Commercial is offline
3. Marketing tools = Hermes Marketing owns content generation, but Commercial can `buscar_ofertas_marketing` to offer deals
4. Ariadne reads data, never writes to CRM — analysis only

## Flujo de pago (post-v1.4.0)
`validar_comprobante` (Commercial → pending_review) → `stale_payments` (Mission Control alerta si > 24h) → `registrar_deposito` (Director confirma) → Liberar Voucher (`POST /webhook/aliun-deposito-aprobado` → Gotenberg PDF → Gmail + WhatsApp)

## Versión
v1.4.0 · 08 JUN 2026 · `validar_comprobante` y `registrar_deposito` migradas de webhook n8n a RPC Supabase directa; añadida `stale_payments`.