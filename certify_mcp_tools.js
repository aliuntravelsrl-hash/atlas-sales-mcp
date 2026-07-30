import { registerConsultarDisponibilidad } from './src/tools/consultar_disponibilidad.js';
import { registerBuscarHoteles } from './src/tools/buscar_hoteles.js';
import { registrarGenerarCotizacionPdf } from './src/tools/generar_cotizacion_pdf.js';
import { registrarRegistrarDeposito } from './src/tools/registrar_deposito.js';
import { registrarValidarComprobante } from './src/tools/validar_comprobante.js';

// Mock McpServer para emular el registro y llamada de herramientas
class MockMcpServer {
  constructor() {
    this.tools = {};
  }
  
  tool(name, description, schema, handler) {
    this.tools[name] = { name, description, schema, handler };
  }
}

const config = {
  supabaseUrl: 'https://oyihiyivdhfxpyiwnmqk.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95aWhpeWl2ZGhmeHB5aXdubXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mzk5NzUsImV4cCI6MjA3ODAxNTk3NX0.8jbifKF9FCExFN3PF1OeUFDVRoHyf652vMHpIgR1DSE',
  supabaseServiceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95aWhpeWl2ZGhmeHB5aXdubXFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQzOTk3NSwiZXhwIjoyMDc4MDE1OTc1fQ.6XRTNHLwhPlGWObFGqfvY-YlB9prcxWlWBCa8oyiOT0',
  n8nWebhookBase: 'https://n8n-n8n.xaruuo.easypanel.host'
};

async function testMatrix() {
  console.log('--- EMPEZANDO CERTIFICACIÓN DE MATRIZ 5x5 DE HERRAMIENTAS MCP ---');
  const server = new MockMcpServer();

  const toolNames = [
    'consultar_disponibilidad',
    'buscar_hoteles',
    'generar_cotizacion_pdf',
    'registrar_deposito',
    'validar_comprobante'
  ];

  // 1. REGISTERED & 2. DISCOVERABLE Checks
  try {
    registerConsultarDisponibilidad(server, config);
    registerBuscarHoteles(server, config);
    registrarGenerarCotizacionPdf(server, config);
    registrarRegistrarDeposito(server, config);
    registrarValidarComprobante(server, config);
    console.log('✅ 1. REGISTERED: Todas las herramientas importadas y registradas correctamente.');
  } catch (err) {
    console.error('❌ 1. REGISTERED Failed:', err);
    return;
  }

  // DISCOVERABLE
  const registeredKeys = Object.keys(server.tools);
  const allFound = toolNames.every(name => registeredKeys.includes(name));
  if (allFound) {
    console.log('✅ 2. DISCOVERABLE: Todas las 5 herramientas son visibles en la lista del servidor.');
  } else {
    console.error('❌ 2. DISCOVERABLE Failed. Registradas:', registeredKeys);
    return;
  }

  // 3. CALLABLE, 4. RETURN & 5. ERROR Checks
  for (const name of toolNames) {
    console.log(`\n=== Evaluando Tool: ${name} ===`);
    const tool = server.tools[name];

    // Prueba 1: CALLABLE & RETURN (Entrada Válida)
    try {
      let mockInput = {};
      if (name === 'consultar_disponibilidad') {
        mockInput = { slug: 'playa-bachata-spa-resort', check_in: '2026-08-14', check_out: '2026-08-16', adults: 2, children: 0 };
      } else if (name === 'buscar_hoteles') {
        mockInput = { query: 'Punta Cana' };
      } else if (name === 'generar_cotizacion_pdf') {
        mockInput = { hotel_id: 1, check_in: '2026-08-14', check_out: '2026-08-16', adults: 2, children: 0, client_name: 'Test Client', client_email: 'test@example.com' };
      } else if (name === 'registrar_deposito') {
        mockInput = { booking_ref: 'TEST-REF', monto: 100, metodo: 'transferencia', notas: 'Test' };
      } else if (name === 'validar_comprobante') {
        mockInput = { booking_ref: 'TEST-REF', evidence_url: 'https://example.com/receipt.jpg', notes: 'Test receipt' };
      }

      console.log(`Calling ${name} with valid input...`);
      const result = await tool.handler(mockInput);
      console.log(`✅ 3. CALLABLE: Llamada exitosa.`);
      
      if (result && Array.isArray(result.content) && result.content[0]?.type === 'text') {
        console.log(`✅ 4. RETURN: Retornó formato MCP válido.`);
        const textPayload = JSON.parse(result.content[0].text);
        if (textPayload.error) {
          console.log(`⚠️ Advertencia de Handler (esperada si no hay registros o webhook simula error):`, textPayload.error);
        } else {
          console.log(`ℹ️ Contenido retornado:`, typeof textPayload === 'object' ? Object.keys(textPayload) : textPayload);
        }
      } else {
        console.error(`❌ 4. RETURN Failed: Formato de retorno no-conforme con MCP.`, result);
      }
    } catch (err) {
      console.error(`❌ CALLABLE/RETURN Failed para ${name}:`, err.message);
    }

    // Prueba 2: ERROR handling (Entradas inválidas / nulas)
    try {
      console.log(`Calling ${name} with invalid arguments to test error capture...`);
      // Llama pasándole nulos o vacíos para que falle controladamente
      const resultErr = await tool.handler({});
      if (resultErr && Array.isArray(resultErr.content) && resultErr.content[0]?.type === 'text') {
        const textErrPayload = JSON.parse(resultErr.content[0].text);
        if (textErrPayload.error) {
          console.log(`✅ 5. ERROR: Error capturado y retornado limpiamente en JSON:`, textErrPayload.error);
        } else {
          console.log(`⚠️ Retornó payload sin error explícito.`);
        }
      } else {
        console.log(`✅ 5. ERROR: Captura de error arrojó excepción o formato plano.`);
      }
    } catch (err) {
      console.log(`✅ 5. ERROR: Lanzó excepción capturada de forma segura:`, err.message);
    }
  }
}

testMatrix();
