# CHANGELOG — atlas-sales-mcp

## v1.1.0

### Arquitectura
- Se elimina el `StreamableHTTPServerTransport` singleton global.
- Se adopta arquitectura stateful correcta con `Map<sessionId, { transport, server }>`.
- `POST /mcp` sin `mcp-session-id` crea sesión nueva y conecta `server + transport` por sesión.
- `POST /mcp` con `mcp-session-id` reutiliza la sesión correcta.
- `DELETE /mcp` cierra y limpia la sesión.
- `GET /health` ahora reporta `activeSessions`.
- `buildServer()` se mueve a `src/server.js` como factory pura, sin estado global.

### Estructura
- Se separa entry point, config y tools en módulos dedicados.
- Se centralizan env vars en `src/config.js`.
- Se agregan `Dockerfile`, `.env.example`, `CHECKLIST_TEST.md` y este changelog.

### Tools
- Se conservan sin cambio de lógica de negocio las 4 tools core:
  - `consultar_disponibilidad`
  - `generar_cotizacion_pdf`
  - `registrar_deposito`
  - `validar_comprobante`
- Se agrega `buscar_hoteles` con schema estructurado y fallback webhook n8n.
- Se agregan `obtener_galeria_hotel` y `generar_post_creativo`.

### Seguridad / operación
- Se mantienen credenciales vía env vars.
- No se hardcodean secretos.
- Se agrega limpieza por TTL de sesiones inactivas.

## v1.0.1
- Versión monolítica con 4 tools core.
- Uso incorrecto de `StreamableHTTPServerTransport` singleton compartido.
- Sin cierre/gestión de sesiones HTTP MCP por `sessionId`.
