# Reynoso Drop

[Abrir la app](https://reynosoch.github.io/reynoso-drop/)

Pasa texto, código y archivos entre dos laptops, un iPad o un teléfono. Sitio estático en **GitHub Pages**, cambios directos en **main**, sin Supabase ni base de datos. No necesitas cuenta ni instalar nada.

## Uso

1. Abre la app en ambos dispositivos.
2. En el primero pulsa **Crear sala** y copia su código o enlace.
3. En el segundo pega el código y pulsa **Conectar**. Un enlace rellena el código; debes pulsar Conectar.
4. En el primero pulsa **Permitir** al reconocer tu dispositivo.
5. Envía texto con el botón o Ctrl/⌘+Enter. El destinatario puede copiarlo o descargarlo como `.txt`.
6. Elige o arrastra uno o varios archivos. En el otro dispositivo pulsa **Recibir archivo** y después **Descargar**.

Mantén ambas páginas abiertas y el iPad despierto durante el envío. La sala conecta **dos dispositivos** y funciona en ambas direcciones. Para otro dispositivo crea una sala nueva.

## Qué se guarda y qué no

- GitHub publica únicamente el código de la app. El texto y los archivos de las transferencias **no se escriben en el repositorio**.
- Los mensajes y archivos recibidos quedan en memoria del navegador; al recargar o cerrar se pierden. Descarga lo que necesites conservar.
- No hay localStorage, IndexedDB, cookies propias, analítica, login, API keys ni base de datos.
- PeerJS Cloud gratuito intercambia los metadatos de conexión (señalización). El contenido viaja por el canal de datos WebRTC cifrado, directo cuando es posible y mediante el relay TURN predeterminado de PeerJS cuando hace falta. No hay respaldo de almacenamiento. Se usa la configuración STUN/TURN oficial de la versión fijada; su disponibilidad depende del proveedor y de la red.
- El código de sala contiene 96 bits aleatorios. No es una contraseña corporativa: compártelo solo con el dispositivo destinatario. El anfitrión debe permitir cada conexión.
- Las salas no expiran por reloj mientras la página esté abierta. Las solicitudes pendientes expiran a los 90 segundos. **Cerrar sala** revoca la sesión.
- Se aceptan archivos de hasta **50 MB** y textos de hasta **512 KB** por envío. La bandeja admite 30 elementos y reserva hasta **100 MB** de contenido. El uso real de memoria puede ser mayor durante lectura y verificación; usa archivos más pequeños en iPad.
- Los archivos se envían secuencialmente en bloques de 64 KB con confirmación. SHA-256 comprueba que los bytes recibidos coinciden. No se previsualiza ni ejecuta contenido recibido.
- El destinatario acepta los archivos individualmente. Puedes cancelar; un envío solo se da por entregado después de la confirmación remota.

## Redes corporativas

GitHub Pages, PeerJS Cloud, WebSockets, STUN y WebRTC deben estar permitidos por la red. La app **no garantiza** funcionar en una laptop administrada y no elude bloqueos corporativos. Si abre la página pero no conecta, consulta con TI para un canal autorizado. Solo usa contenido que tengas permitido transferir.

No funciona con el dispositivo receptor apagado ni ofrece un historial en la nube. Esas funciones requerirían almacenamiento o un servidor adicional.

## Desarrollo y despliegue

HTML, CSS y JavaScript nativos. PeerJS **1.5.5**, fijado y alojado en `vendor/` con su licencia MIT. Sin dependencias de compilación.

```sh
npm run check
npm run build
```

`check` valida sintaxis y el protocolo: límites, códigos, bloques, archivos vacíos, corrupción e integridad. `build` genera `dist/`.

GitHub Pages publica directamente **main / (root)**; `.nojekyll` desactiva Jekyll. `Verify main` corre los checks y el build en cada push. No abras ramas ni PR para cambios solicitados directamente en main.

## AGENT_CONTEXT

Este proyecto es independiente del reconciliador Visteon. Mantén el alcance: transferencia temporal entre dos dispositivos, sin persistencia ni secretos. No agregues Supabase, almacenamiento remoto ni guardado de archivos en GitHub. Conserva permisos de conexión y de recepción, límites de memoria y verificación SHA-256. No uses credenciales corporativas. Cambios directos en main; ejecutar check/build y verificar Actions/Pages al publicar. La prueba en una red externa no confirma compatibilidad con la red corporativa.
