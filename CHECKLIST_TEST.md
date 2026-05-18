# CHECKLIST TEST — atlas-sales-mcp v1.1.x

## 0. Precondiciones
- Variables de entorno cargadas
- Deploy en EasyPanel levantado
- Endpoints n8n y Supabase accesibles

## 1. Health
```bash
curl -s https://YOUR-MCP-HOST/health
```
Esperado:
- `status: up`
- `version: 1.1.x`
- `activeSessions: 0`

## 2. Initialize
```bash
curl -i -sS -X POST https://YOUR-MCP-HOST/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"atlas-test","version":"1.0"}}}'
```
Esperado:
- `HTTP 200`
- header `mcp-session-id`
- serverInfo `atlas-sales-tools`

## 3. tools/list
Usar el `mcp-session-id` del paso anterior.
```bash
curl -i -sS -X POST https://YOUR-MCP-HOST/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'mcp-session-id: SESSION_ID' \
  --data '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```
Esperado:
- 7 tools visibles
- descripciones correctas

## 4. Call real por tool

### 4.1 consultar_disponibilidad
Verifica RPC Supabase con slug+fechas reales.

### 4.2 buscar_hoteles
- probar RPC `buscar_hoteles`
- si falla, verificar fallback webhook n8n
- confirmar `source` en respuesta

### 4.3 generar_cotizacion_pdf
Confirmar respuesta con `pdf_url` o payload equivalente.

### 4.4 registrar_deposito
Validar respuesta de webhook y side effect esperado.

### 4.5 validar_comprobante
Validar respuesta con resultado utilizable por operaciones.

### 4.6 obtener_galeria_hotel
Confirmar URLs/imágenes válidas.

### 4.7 generar_post_creativo
Confirmar copy generado y metadata útil.

## 5. DELETE session
```bash
curl -i -sS -X DELETE https://YOUR-MCP-HOST/mcp \
  -H 'mcp-session-id: SESSION_ID'
```
Esperado:
- `HTTP 204`
- `activeSessions` baja en `/health`

## 6. Regression check
- repetir initialize → tools/list dos veces seguidas
- confirmar que no reaparece `Already connected to a transport`
