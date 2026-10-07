# Reynoso Drop

[Abrir la app](https://reynosoch.github.io/reynoso-drop/)

Pasa texto, código, capturas y archivos entre dos dispositivos mediante WebRTC. Funciona como sitio estático en **GitHub Pages**, sin Supabase, sin cuentas y sin base de datos remota. La versión 1.6 añade modo **PWA para iPad**, envío rápido con Enter y recuperación local de sesión.

## Uso rápido

1. Abre la app en ambos dispositivos.
2. En uno pulsa **Crear sala**. Se genera un código de 4 números y un QR.
3. En el otro escribe los 4 números o escanea el QR. La conexión se intenta automáticamente, sin autorización adicional del anfitrión.
4. Escribe o pega texto. **Enter envía inmediatamente**. **Shift+Enter** inserta una nueva línea. El botón Enviar sigue disponible.
5. Para archivos usa **Agregar fotos y archivos**, **Elegir fotos**, arrastrar/soltar o pegar cuando el navegador exponga archivos del portapapeles.
6. Los textos muy grandes se preparan como `.txt`; los archivos se transfieren por bloques y se validan con SHA-256.

## iPad / PWA

En Safari abre la app y usa **Compartir → Agregar a pantalla de inicio**. La PWA usa `manifest.webmanifest`, iconos propios y un service worker que guarda en caché la interfaz estática. Puede abrir el cascarón de la app sin red, pero para conectar dos dispositivos sigue siendo necesaria una red que permita PeerJS/WebRTC.

## Sesión persistente local

La app guarda en `localStorage` únicamente información pequeña de sesión: rol (host/invitado), código de sala, nombre del dispositivo, preferencia de recepción automática y un borrador de texto razonable. No existe una base de datos de servidor.

- Si haces **F5**, Safari mata la pestaña o pierdes internet, la app intenta levantar la misma sala y reconectar cuando vuelve a ser posible.
- El anfitrión intenta reutilizar el mismo código de 4 dígitos. Si ese identificador todavía está ocupado, el flujo normal de colisión puede generar uno nuevo.
- El reintento local ocurre cada pocos segundos cuando la interfaz está ociosa y hay red.
- **Cerrar sala** borra intencionalmente la sesión guardada en ese navegador.
- El nombre del dispositivo y la preferencia de recepción automática también se conservan localmente.

La bandeja de archivos recibidos y los blobs **siguen siendo temporales en memoria**: no se guardan tras recargar para evitar convertir el navegador en almacenamiento de documentos. Descarga lo que quieras conservar.

## Privacidad y red

- GitHub Pages publica únicamente el código de la app.
- Los archivos y textos transferidos no se escriben en GitHub, Supabase ni otra base de datos.
- PeerJS Cloud se usa para señalización. El contenido viaja por WebRTC cifrado, directo cuando es posible o mediante TURN cuando la red lo requiere.
- El código/QR permite conectar directamente a la segunda pantalla. Solo se admite una conexión remota a la vez.
- La app no descubre equipos arbitrarios de la LAN, no escanea rangos IP y no puede saltarse restricciones de una VPN o red corporativa.
- Si WebRTC, WebSocket, STUN o TURN están bloqueados, la app puede abrir pero no completar la conexión.

## Límites de transferencia

- Archivo individual: **50 MB**.
- Selección/bandeja en memoria: **100 MB**.
- Texto directo: **512 KB**; texto muy largo se prepara como `.txt`.
- Hasta 30 elementos en la bandeja.
- Bloques de 64 KB con confirmación e integridad SHA-256.

## Desarrollo

HTML, CSS y JavaScript nativos. PeerJS 1.5.5 y qrcode-generator 1.4.4 están fijados dentro de `vendor/`.

```sh
npm run check
npm run build
```

`check` valida sintaxis y la suite de pruebas existente. `build` genera `dist/` e incluye la PWA (`session.js`, `service-worker.js`, manifiesto e iconos).

## Despliegue

GitHub Pages publica directamente **main / (root)**. `.nojekyll` permanece en el repositorio. El workflow **Verify main** ejecuta checks y build en cada push.

## AGENT_CONTEXT

Proyecto independiente del reconciliador Visteon. Cambios directos en `main`, sin PR cuando el usuario lo pida así. Mantener transferencia dispositivo-a-dispositivo, sin Supabase ni almacenamiento remoto de contenido. No eliminar carga de archivos, QR, recepción automática/manual, SHA-256, límites de memoria ni compatibilidad con iPad.

v1.6 cambia deliberadamente una decisión anterior: la **sesión sí se conserva localmente** para sobrevivir F5/cortes, mientras que la bandeja y los archivos recibidos continúan solo en memoria. `localStorage` se usa para metadatos pequeños y preferencias; no se usa una base de datos remota. Enter envía texto y Shift+Enter crea salto de línea. La PWA es instalable en iPad y cachea únicamente recursos estáticos de la app.
