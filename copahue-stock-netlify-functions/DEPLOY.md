# Hotel Copahue · Control de Stock — Guía de despliegue (sin costo)

Esta versión NO usa Firebase Cloud Functions ni el plan Blaze. Los emails
los manda **Netlify Functions**, que ya está incluido gratis en el mismo
Netlify donde tenés publicado el sitio. Firestore (la base de datos) sigue
usando el plan gratuito de Firebase (Spark) — nada de esto tiene costo.

Contenido de este paquete:

- `index.html` → el sitio (reemplaza al actual).
- `netlify/functions/enviar-alerta-stock.js` → envía el email cuando un producto cruza el stock mínimo.
- `netlify/functions/enviar-solicitud-pedido.js` → envía el email cuando se genera una solicitud de pedido.
- `netlify.toml` → le dice a Netlify dónde están las funciones.
- `firestore.rules` → reglas de seguridad recomendadas para Firestore (se pegan directo en la consola de Firebase, sin instalar nada).

## 1. Subir los archivos a GitHub

Todo este paquete (menos `firestore.rules`, que no toca el sitio) va a tu repositorio de GitHub, respetando esta ubicación:

```
tu-repositorio/
├── index.html
├── netlify.toml
└── netlify/
    └── functions/
        ├── enviar-alerta-stock.js
        └── enviar-solicitud-pedido.js
```

Hacé commit y push. Netlify va a redesplegar solo.

## 2. Crear cuenta y API key en Resend

1. Andá a **resend.com** → "Sign up" → registrate con tu email.
2. Confirmá el email que te llega.
3. En el panel, menú izquierdo → **"API Keys"** → botón **"Create API Key"** (arriba a la derecha) → nombre "Control de Stock" → permiso "Sending access" → **"Add"**.
4. Te muestra la clave una sola vez (empieza con `re_...`). Copiala ahora, no se puede ver de nuevo.
5. *(Opcional, recomendado)* Menú izquierdo → **"Domains"** → **"Add Domain"** → `hotelcopahue.com` → te da unos registros DNS para cargar donde administrás el dominio. Sin este paso los emails igual salen, solo que desde una dirección de prueba de Resend.

## 3. Cargar la API key en Netlify (sin usar ninguna terminal)

1. Andá a **app.netlify.com** e iniciá sesión.
2. Entrá al sitio **stock-hotelcopahue**.
3. Menú superior → **"Site configuration"** (o "Site settings").
4. En el menú de la izquierda → **"Environment variables"**.
5. Botón **"Add a variable"** → **"Add a single variable"**.
   - Key: `RESEND_API_KEY`
   - Value: pegá la clave `re_...` que copiaste de Resend.
   - Scopes: dejalo en todos ("All scopes") o al menos "Functions".
6. **"Create variable"**.
7. Como la variable se agregó después del último deploy, hace falta un redeploy para que la función la vea: pestaña **"Deploys"** (arriba) → botón **"Trigger deploy"** → **"Deploy site"**. Esperá a que diga "Published".

## 4. Publicar las reglas de Firestore (sin CLI, gratis)

1. Andá a **console.firebase.google.com** → proyecto **hotel-copahue-stock-4ac93**.
2. Menú izquierdo → **"Firestore Database"** → pestaña **"Reglas"** (Rules) arriba.
3. Borrá lo que haya en el editor y pegá el contenido completo del archivo `firestore.rules` de este paquete.
4. Botón **"Publicar"** (Publish).

Esto no requiere el plan Blaze — leer/escribir Firestore y publicar reglas es parte del plan gratis.

## 5. Primer ingreso al sitio

En **stock-hotelcopahue.netlify.app**, una vez que el deploy con el `index.html` nuevo haya terminado:

- Usuario: `33717567639`
- Contraseña: `Copahue`

Se crea sola la primera vez que la usás. Desde el botón **"👥 Usuarios"** del encabezado podés crear el resto de los usuarios del hotel (todos con los mismos permisos).

## Cómo probar que los emails funcionan

- Cargá un producto de prueba con un mínimo, por ejemplo mínimo `5`, stock inicial `6`.
- Andá a "Movimiento" → Baja → cantidad `2` → Registrar. El stock queda en `4`, por debajo del mínimo: tiene que aparecer un aviso rojo en pantalla y, en un minuto, llegar el email a los tres correos.
- Si no llega: revisá en Netlify → tu sitio → pestaña **"Functions"** → hacé clic en `enviar-alerta-stock` → ahí se ven los logs de cada ejecución y el motivo si algo falló (API key mal cargada, error de Resend, etc.).
- Borrá el producto de prueba cuando termines.

## Notas

- Los emails de alerta de stock solo se mandan cuando el stock **cruza** el mínimo (pasaba de estar arriba a quedar igual o por debajo) al registrar una baja — no se repite en cada ajuste posterior mientras se mantenga bajo.
- Si más adelante cambian los destinatarios o el remitente, se edita la constante `DESTINATARIOS` o `FROM_EMAIL` al principio de cada archivo en `netlify/functions/` y se sube de nuevo a GitHub.
- Con el volumen normal de un hotel (decenas de movimientos y pedidos por día), tanto Netlify Functions como Resend se mantienen dentro de sus niveles gratuitos sin ningún costo.
