/**
 * Netlify Function — envía el email de "nueva solicitud de pedido".
 * El sitio (index.html) llama a este endpoint por fetch() cada vez que se
 * genera una solicitud desde la pestaña "Pedido".
 */

const DESTINATARIOS = [
  'giuliano.zolvini@hotelcopahue.com',
  'administracion@hotelcopahue.com',
  'jose.bazzani@hotelcopahue.com',
];

const FROM_EMAIL = 'Hotel Copahue Stock <onboarding@resend.dev>';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'JSON inválido' };
  }

  const { usuario, fecha, items } = payload;
  if (!Array.isArray(items) || items.length === 0) {
    return { statusCode: 400, body: 'La solicitud no tiene ítems' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Falta configurar la variable de entorno RESEND_API_KEY en Netlify.');
    return { statusCode: 500, body: 'Falta configurar RESEND_API_KEY' };
  }

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
    <p>Generada por <b>${usuario || 'desconocido'}</b> el ${fecha || ''}.</p>
    <table style="border-collapse:collapse;">
      <tr>
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Producto</th>
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Stock disponible</th>
        <th style="padding:6px 10px;border:1px solid #ddd;text-align:left;">Cantidad solicitada</th>
      </tr>
      ${filas}
    </table>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: DESTINATARIOS,
        subject: `📦 Solicitud de pedido de ${usuario || 'desconocido'}`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Resend respondió con error:', res.status, text);
      return { statusCode: 502, body: 'Resend rechazó el envío' };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Error llamando a Resend:', err);
    return { statusCode: 500, body: 'Error interno al enviar el email' };
  }
};
