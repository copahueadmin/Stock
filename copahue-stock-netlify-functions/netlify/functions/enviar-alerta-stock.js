/**
 * Netlify Function — envía el email de "stock bajo mínimo".
 * El sitio (index.html) llama a este endpoint por fetch() cuando, al
 * registrar una baja, un producto cruza por debajo de su mínimo.
 *
 * La API Key de Resend se lee de una variable de entorno configurada en
 * Netlify (Site settings → Environment variables), nunca queda expuesta
 * en el navegador ni en el repositorio.
 */

const DESTINATARIOS = [
  'giuliano.zolvini@hotelcopahue.com',
  'administracion@hotelcopahue.com',
  'jose.bazzani@hotelcopahue.com',
];

// Mientras no verifiques un dominio propio en Resend, este remitente de
// prueba funciona igual. Si verificás un dominio (ver DEPLOY.md), cambiá
// esta línea por algo como 'Hotel Copahue Stock <alertas@hotelcopahue.com>'.
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

  const { nombre, categoria, unidad, stockActual, minimo } = payload;
  if (!nombre || minimo === undefined || minimo === null) {
    return { statusCode: 400, body: 'Faltan datos del producto' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Falta configurar la variable de entorno RESEND_API_KEY en Netlify.');
    return { statusCode: 500, body: 'Falta configurar RESEND_API_KEY' };
  }

  const html = `
    <h2 style="margin:0 0 10px;">⚠️ Alerta de stock mínimo</h2>
    <p>El producto <b>${nombre}</b> (${categoria || ''}) quedó por debajo del mínimo establecido en el sistema de Control de Stock del Hotel Copahue.</p>
    <ul>
      <li>Stock actual: <b>${stockActual} ${unidad || ''}</b></li>
      <li>Mínimo configurado: <b>${minimo} ${unidad || ''}</b></li>
    </ul>
    <p>Ingresá al sistema para gestionar la reposición.</p>
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
        subject: `⚠️ Stock bajo mínimo: ${nombre}`,
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
