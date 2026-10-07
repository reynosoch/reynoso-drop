# Reynoso Drop

[Abrir la app](https://reynosoch.github.io/reynoso-drop/)

Pasa texto, código y archivos entre dos laptops, un iPad o un teléfono. Sitio estático en **GitHub Pages**, cambios directos en **main**, sin Supabase ni base de datos. No necesitas cuenta ni instalar nada.

## Uso

1. Abre la app en ambos dispositivos.
2. Puedes nombrar las pantallas, por ejemplo **Laptop personal**, **Laptop corporativa** o **iPad**. En el primero pulsa **Crear sala**: aparece un código de **6 números**, como `123 456`.
3. En el segundo escribe los 6 números: al completar el sexto se intenta conectar automáticamente. También puedes pegar o abrir el enlace; inicia el mismo proceso sin otro clic. **Conectar** y Enter siguen disponibles para reintentar.
4. En el primero pulsa **Permitir** al reconocer tu dispositivo. Ambos aparecen por nombre y estado en **Dispositivos de esta sala**. El primer permiso se conserva mientras la página esté abierta: si el equipo autorizado pierde la conexión, intenta volver una vez automáticamente sin reescribir el código ni pedir otro permiso.
5. Envía texto con el botón o Ctrl/⌘+Enter. El destinatario puede copiarlo o descargarlo como `.txt`.
6. Agrega uno o varios archivos desde **Agregar fotos y archivos** o **Elegir fotos**, arrástralos a la zona de carga o pega una captura desde el portapapeles. Puedes preparar la selección antes de conectar; revisa nombres, tamaños y miniaturas, y quita lo que no quieras enviar.
7. Con la otra pantalla conectada pulsa **Enviar archivos**. En el otro dispositivo pulsa **Recibir archivo** y después **Descargar**. Lo entregado sale de la selección; si cancelas o falla la conexión, los archivos pendientes quedan seleccionados para reintentar.

Mantén ambas páginas abiertas y el iPad despierto durante el envío. La sala conecta **dos dispositivos** y funciona en ambas direcciones. Para otro dispositivo crea una sala nueva.

## Qué se guarda y qué no

- GitHub publica únicamente el código de la app. El texto y los archivos de las transferencias **no se escriben en el repositorio**.
- Los mensajes y archivos recibidos quedan en memoria del navegador; al recargar o cerrar se pierden. Descarga lo que necesites conservar.
- No hay localStorage, IndexedDB, cookies propias, analítica, login, API keys ni base de datos.
- PeerJS Cloud gratuito intercambia los metadatos de conexión (señalización). El contenido viaja por el canal de datos WebRTC cifrado, directo cuando es posible y mediante el relay TURN de PeerJS cuando hace falta. No hay respaldo de almacenamiento. Se usan los servidores y credenciales públicos STUN/TURN oficiales de la versión fijada, con candidatos TURN UDP y TCP en el puerto 3478; su disponibilidad depende del proveedor y de la red. Estas credenciales públicas pertenecen al servicio compartido de PeerJS, no al usuario.
- El código de sala tiene **6 dígitos aleatorios** y conserva los ceros iniciales. Las colisiones se reintentan automáticamente con otro código, hasta cuatro veces. Al ser corto, el código identifica la sala pero **no autoriza acceso por sí solo**: el anfitrión permite el primer dispositivo. La reconexión del equipo autorizado verifica además un identificador aleatorio de 96 bits que existe solo durante la vida de esa página. No uses contraseñas corporativas.
- Los códigos sin conexión expiran a los **10 minutos**. La sesión conectada sigue activa mientras ambas páginas estén abiertas. Tras una desconexión el anfitrión conserva la sala durante otros 10 minutos; el invitado hace un intento de reconexión automática. Las solicitudes pendientes expiran a los 90 segundos. **Cerrar sala** revoca la sesión y el permiso recordado. Recargar también pierde esa identidad temporal; no se promete reconexión tras recargar.
- Se aceptan archivos de hasta **50 MB** y textos de hasta **512 KB** por envío. La bandeja admite 30 elementos y reserva hasta **100 MB** de contenido. El uso real de memoria puede ser mayor durante lectura y verificación; usa archivos más pequeños en iPad.
- Los archivos se envían secuencialmente en bloques de 64 KB con confirmación. SHA-256 comprueba que los bytes recibidos coinciden. Las fotos raster compatibles muestran vista previa después de verificar el archivo; HTML, SVG y documentos no se ejecutan ni se previsualizan como páginas.
- El destinatario acepta los archivos individualmente. Puedes cancelar; un envío solo se da por entregado después de la confirmación remota.

## Fotos y archivos de trabajo

- Selección múltiple de **cualquier formato**: fotos JPG/PNG/WebP/HEIC y otras, Excel XLSX/XLS/XLSM/XLSB, CSV, PDF, Word, PowerPoint, ZIP, archivos de código, video y formatos propios de tus herramientas.
- Botón **Elegir fotos** con selector de imágenes; **Agregar fotos y archivos** permite también documentos y cualquier otra extensión. El selector de fotos depende del navegador y del sistema operativo. Se pueden pegar capturas cuando el navegador las entrega como archivos de portapapeles.
- La selección admite **30 archivos y 100 MB en total**, con **50 MB máximo por archivo**. Muestra formato, nombre y tamaño; puedes eliminar elementos antes de enviar.
- Los archivos se transfieren sin convertir, comprimir ni modificar. Los libros de Excel conservan sus bytes originales, fórmulas, hojas, macros y formato; la app no abre ni ejecuta macros. Los documentos recibidos se descargan para abrirlos en su aplicación.
- Las miniaturas y fotos recibidas se muestran usando URLs temporales en memoria. La detección de imágenes usa la cabecera binaria, no la extensión ni un MIME declarado por el remitente. Si el navegador no puede decodificar HEIC/HEIF u otro formato, sigue disponible la descarga original.
- Quitar una foto de la bandeja o vaciarla revoca su URL de vista previa. Limpiar o modificar la selección revoca las miniaturas anteriores. Las vistas previas pueden consumir memoria adicional al límite de contenido de la bandeja.
- La carga prepara archivos localmente; el envío comienza al pulsar **Enviar archivos**. No se suben a GitHub ni Supabase.

## Red y descubrimiento de dispositivos

La lista muestra **los dos dispositivos que participan en la sala**, con su nombre y estado real; no representa un inventario del Wi-Fi. El navegador puede informar el estado general de conexión y, cuando ofrece esa información, el tipo Wi-Fi/Ethernet/móvil. No expone el nombre de tu red ni proporciona descubrimiento general de equipos cercanos. Estar en la misma red no sustituye el primer código.

Para encontrar equipos de una LAN automáticamente hace falta un servicio local o una app instalada. Esta versión conserva GitHub Pages y cero base de datos; no escanea rangos IP, no inventa equipos ni supone que dos visitantes están en la misma red.

## Redes corporativas

GitHub Pages, PeerJS Cloud, WebSockets, STUN y WebRTC deben estar permitidos por la red. La app **no garantiza** funcionar en una laptop administrada y no elude bloqueos corporativos. Si abre la página pero no conecta, consulta con TI para un canal autorizado. Solo usa contenido que tengas permitido transferir.

No funciona con el dispositivo receptor apagado ni ofrece un historial en la nube. Esas funciones requerirían almacenamiento o un servidor adicional.

## Desarrollo y despliegue

HTML, CSS y JavaScript nativos. PeerJS **1.5.5**, fijado y alojado en `vendor/` con su licencia MIT. Sin dependencias de compilación.

```sh
npm run check
npm run build
```

`check` valida sintaxis y el protocolo: límites, códigos cortos con ceros iniciales, permisos de reconexión, nombres de dispositivo, bloques, archivos vacíos, corrupción e integridad. También verifica selección de documentos, conservación de bytes, límites de la cola y detección de fotos sin interpretar HTML/SVG. `build` genera `dist/`.

GitHub Pages publica directamente **main / (root)**; `.nojekyll` desactiva Jekyll. `Verify main` corre los checks y el build en cada push. No abras ramas ni PR para cambios solicitados directamente en main.

## AGENT_CONTEXT

Este proyecto es independiente del reconciliador Visteon. Mantén el alcance: transferencia temporal entre dos dispositivos, sin persistencia ni secretos. No agregues Supabase, almacenamiento remoto ni guardado de archivos en GitHub. Conserva permisos de conexión y de recepción, límites de memoria y verificación SHA-256. No uses credenciales corporativas. Cambios directos en main; ejecutar check/build y verificar Actions/Pages al publicar. La prueba en una red externa no confirma compatibilidad con la red corporativa.
