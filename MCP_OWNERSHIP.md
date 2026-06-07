# MCP Tool Ownership Matrix

## 18 Tools → 4 Agents

### Hermes Ops ⚡ (Centro Nervioso)
- `consultar_pipeline` — metrics for Director reports
- `registrar_deposito` — **SOLO Director via Hermes Ops** (financial)

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
- `validar_comprobante` — validate payment receipt
- `obtener_galeria_hotel` — hotel images to share with client

### Hermes Marketing 📢 (Generación de Demanda)
- `buscar_hoteles` — search catalog for campaigns
- `buscar_ofertas_marketing` — active offers for promotions
- `generar_post_creativo` — captions + hashtags + broadcast messages
- `analisis_financiero` — budget analysis for campaign targeting

### Ariadne Data 🧠 (Inteligencia / Análisis — uses Supabase RPCs directly)
- `consultar_pipeline` — same tool, but Ariadne uses for analytics
- Note: Ariadne primarily uses 7 RPCs (funnel_conversion, funnel_velocity, revenue_by_period, revenue_by_hotel, margin_analysis, stale_leads, segment_summary) — MCP tools are secondary

## Precedence Rules
1. `registrar_deposito` = **Director ONLY** — no agent executes without Director approval
2. Commercial tools = Hermes Commercial owns them, but Ops can call if Commercial is offline
3. Marketing tools = Hermes Marketing owns content generation, but Commercial can `buscar_ofertas_marketing` to offer deals
4. Ariadne reads data, never writes to CRM — analysis only