# Hotel Copahue · Control de Stock — Guía de despliegue

Este paquete contiene:

- `index.html` → el sitio actualizado. Reemplazá el archivo actual en Netlify por este (o subilo al repositorio y dejá que Netlify lo despliegue).
- `functions/` → Cloud Functions de Firebase que envían los emails de alerta (stock bajo mínimo y solicitudes de pedido).
- `firestore.rules` → reglas de seguridad recomendadas para Firestore (exigen usuario logueado).
- `firebase.json` y `.firebaserc` → configuración mínima para desplegar con Firebase CLI, ya apuntando al proyecto `hotel-copahue-stock-4ac93`.

El sitio ya viene conectado al proyecto de Firebase existente (`hotel-copahue-stock-4ac93`), así que no hace falta crear nada nuevo ahí — solo desplegar estos archivos.

## 1. Publicar el nuevo `index.html`

Reemplazá el `index.html` en el lugar donde Netlify lo toma (repositorio de GitHub conectado, o carpeta que arrastrás/subís a Netlify) y esperá el redeploy automático. No requiere ningún paso adicional: el login, las categorías, los lotes con vencimiento, etc. funcionan apenas se publica.

## 2. Preparar Firebase CLI (una sola vez)

Necesitás Node.js instalado. Después:

```bash
npm install -g firebase-tools
firebase login
```

Iniciá sesión con la cuenta de Google que administra el proyecto `hotel-copahue-stock-4ac93`.

## 3. Pasar el proyecto a plan "Blaze" (pago por uso)

Las Cloud Functions que llaman a una API externa (Resend, para mandar los emails) requieren que el proyecto esté en el plan **Blaze** de Firebase (tiene nivel gratuito generoso; para el volumen de este sistema el costo esperado es prácticamente $0, pero Google exige tener una tarjeta cargada).

Se hace desde: [Firebase Console](https://console.firebase.google.com) → proyecto `hotel-copahue-stock-4ac93` → ícono de engranaje → "Uso y facturación" → "Modificar plan" → Blaze.

## 4. Crear la cuenta de Resend y la API Key

1. Creá una cuenta gratuita en [resend.com](https://resend.com).
2. Andá a **API Keys** y generá una nueva. Copiala (empieza con `re_...`).
3. (Opcional pero recomendado) Verificá un dominio propio, por ejemplo `hotelcopahue.com`, en **Domains**, agregando los registros DNS que te indique Resend. Si no lo hacés, los emails se envían igual usando el remitente de pruebas `onboarding@resend.dev`, pero conviene migrar a un dominio propio para que no caigan en spam y para que el remitente sea reconocible.
4. Si verificás tu propio dominio, editá en `functions/index.js` la constante `FROM_EMAIL` (por ejemplo `'Hotel Copahue Stock <alertas@hotelcopahue.com>'`).

## 5. Configurar la API Key como secreto de Firebase

Desde la carpeta de este paquete (donde está `firebase.json`):

```bash
firebase functions:secrets:set RESEND_API_KEY
```

Te va a pedir que pegues el valor (la API Key de Resend). Quedará guardada de forma segura en Google Cloud Secret Manager, nunca en el código.

## 6. Instalar dependencias y desplegar las funciones

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Esto publica dos funciones:

- `alertaStockMinimo`: se dispara sola cada vez que se actualiza un producto en Firestore; si el stock cruza por debajo del mínimo configurado, manda el email a `giuliano.zolvini@hotelcopahue.com`, `administracion@hotelcopahue.com` y `jose.bazzani@hotelcopahue.com`.
- `notificarSolicitudPedido`: se dispara cuando se genera una solicitud de pedido desde la pestaña "Pedido" del sitio, y manda el email con el detalle a los mismos tres correos.

No hay que tocar nada más: el sitio ya escribe en las colecciones de Firestore que estas funciones escuchan.

## 7. Publicar las reglas de Firestore

```bash
firebase deploy --only firestore:rules
```

Estas reglas exigen que el usuario haya iniciado sesión (usuario y contraseña dentro del sitio) para leer o escribir cualquier dato. Si preferís revisarlas o ajustarlas antes, están en `firestore.rules`.

## 8. Primer ingreso al sistema

Con el sitio ya publicado, entrá con:

- **Usuario:** `33717567639`
- **Contraseña:** `Copahue`

La primera vez que uses estas credenciales, el sitio crea automáticamente la cuenta de administrador en Firebase Authentication. Desde adentro, con el botón "👥 Usuarios" del encabezado, podés crear el resto de los usuarios del hotel (todos tienen los mismos permisos una vez logueados).

## Notas y límites a tener en cuenta

- **Categorías, lotes y vencimientos**: los productos que ya existían se migran automáticamente la primera vez que se muestran (se genera un "lote" con el stock y el vencimiento que ya tenían cargado). No hace falta ninguna migración manual.
- **Litros → unidades**: para que un producto en litros muestre la cantidad de unidades disponibles, cuando lo cargués o edites completá el campo "Litros por unidad" (por ejemplo, `0.75` para una botella de 750 cc).
- **Emails de alerta**: solo se disparan cuando el stock *cruza* el mínimo (pasa de estar arriba a estar igual o por debajo) al registrar una baja, para no mandar un email repetido en cada ajuste mientras sigue por debajo del mínimo.
- **Costo**: con el volumen normal de un hotel (decenas de movimientos y pedidos por día), tanto Firebase (Blaze) como Resend se mantienen dentro de sus niveles gratuitos.
- Si en algún momento cambian el dominio de envío o los destinatarios de las alertas, se edita `functions/index.js` (constantes `FROM_EMAIL` y `DESTINATARIOS`) y se vuelve a correr `firebase deploy --only functions`.
