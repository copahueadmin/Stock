/**
 * Cloud Functions — Hotel Copahue · Control de Stock
 *
 * Dos funciones, ambas disparadas por escrituras en Firestore (no hace
 * falta que el sitio llame a ninguna API externa desde el navegador):
 *
 *  1) alertaStockMinimo: cuando el stock de un producto cruza por DEBAJO
 *     de su mínimo configurado (antes estaba arriba, ahora quedó igual o
 *     por debajo), envía un email de alerta.
 *
 *  2) notificarSolicitudPedido: cuando se crea una solicitud de pedido
 *     desde la pestaña "Pedido" del sitio, envía un email con el detalle.
 *
 * Ambas usan la API de Resend (https://resend.com) vía fetch, sin
 * necesidad de instalar su SDK. La API key se guarda como "secret" de
 * Firebase (ver DEPLOY.md), nunca queda expuesta en el código ni en el
 * navegador.
 */

const { onDocumentUpdated, onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');

const RESEND_API_KEY = defineSecret('RESEND_API_KEY');

// Destinatarios fijos de todas las alertas del sistema.
const DESTINATARIOS = [
  'giuliano.zolvini@hotelcopahue.com',
  'administracion@hotelcopahue.com',
  'jose.bazzani@hotelcopahue.com',
];

// Remitente. Mientras no verifiques un dominio propio en Resend (por
// ejemplo alertas@hotelcopahue.com), usá el dominio de pruebas de Resend:
// funciona para probar, pero conviene cambiarlo a un dominio propio antes
// de usarlo en producción (ver DEPLOY.md).
const FROM_EMAIL = 'Hotel Copahue Stock <onboarding@resend.dev>';

async function enviarEmail(apiKey, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: DESTINATARIOS,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error('Error enviando email con Resend', { status: res.status, body: text });
  } else {
    logger.info('Email enviado correctamente', { subject });
  }
}

function totalLotes(producto) {
  if (Array.isArray(producto.lotes) && producto.lotes.length > 0) {
    return producto.lotes.reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
  }
  return Number(producto.stockActual) || 0;
}

exports.alertaStockMinimo = onDocumentUpdated(
  { document: 'copahue_productos/{productoId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const antes = event.data.before.data();
    const despues = event.data.after.data();

    if (despues.minimo === null || despues.minimo === undefined || despues.minimo === '') return;

    const minimo = Number(despues.minimo);
    const totalAntes = totalLotes(antes);
    const totalDespues = totalLotes(despues);

    const estabaArriba = totalAntes > minimo;
    const ahoraAbajo = totalDespues <= minimo;

    if (!(estabaArriba && ahoraAbajo)) return;

    const html = `
      <h2 style="margin:0 0 10px;">⚠️ Alerta de stock mínimo</h2>
      <p>El producto <b>${despues.nombre}</b> (${despues.categoria || ''}) quedó por debajo del mínimo establecido en el sistema de Control de Stock del Hotel Copahue.</p>
      <ul>
        <li>Stock actual: <b>${totalDespues} ${despues.unidad || ''}</b></li>
        <li>Mínimo configurado: <b>${minimo} ${despues.unidad || ''}</b></li>
      </ul>
      <p>Ingresá al sistema para gestionar la reposición.</p>
    `;

    await enviarEmail(RESEND_API_KEY.value(), `⚠️ Stock bajo mínimo: ${despues.nombre}`, html);
  }
);

exports.notificarSolicitudPedido = onDocumentCreated(
  { document: 'copahue_solicitudes/{solicitudId}', secrets: [RESEND_API_KEY] },
  async (event) => {
    const sol = event.data.data();
    const items = Array.isArray(sol.items) ? sol.items : [];

    const filas = items
      .map(
        (it) => `
        <tr>
          <td style="padding:6px 10px;border:1px solid #ddd;">${it.productoNombre || ''}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;">${it.stockActualAlPedido ?? ''} ${it.unidad || ''}</td>
          <td style="padding:6px 10px;border:1px solid #ddd;"><b>${it.cantidadSolicitada ?? ''} ${it.unidad || ''}</b></td>
        </tr>`
      )
      .join('');

    const html = `
      <h2 style="margin:0 0 10px;">📦 Nueva solicitud de pedido</h2>
      <p>Generada por <b>${sol.usuario || 'desconocido'}</b> el ${sol.fecha || ''}.</p>
      <table style="border-collapse:collapse;">
        <tr>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Producto</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Stock disponible</th>
          <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Cantidad solicitada</th>
        </tr>
        ${filas}
      </table>
    `;

    await enviarEmail(RESEND_API_KEY.value(), `📦 Solicitud de pedido de ${sol.usuario || 'desconocido'}`, html);
  }
);
