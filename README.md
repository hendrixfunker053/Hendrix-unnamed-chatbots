# Unnamed Hendrix Chatbots

Prototipo inicial de una app web instalable (PWA), ligera y adaptable a Android, con chats separados, asistentes personalizables y selección de varios asistentes por conversación.

## Estado de esta versión

- [x] Interfaz minimalista adaptable a móvil.
- [x] Crear asistentes con nombre, especialidad, personalidad e historia.
- [x] Elegir uno o varios asistentes para colaborar.
- [x] Guardar chats y perfiles localmente en el navegador.
- [x] Backend Node.js que mantiene la clave de IA fuera del frontend.
- [x] Endpoint de salud y endpoint de chat compatibles con APIs tipo OpenAI.
- [x] Base PWA con manifest y service worker.
- [ ] Despliegue y configuración real del proveedor de IA.
- [ ] Modo de inferencia local en Android.
- [ ] Sincronización segura entre dispositivos y autenticación.

## Estructura

- `public/`: interfaz estática para GitHub Pages.
- `server/`: backend Node.js, pensado para desplegarse en un servicio que ejecute Node.
- `.env.example`: variables de ejemplo; nunca pegues una clave real en este archivo.

## Ejecutar el backend

Requiere Node.js 20 o superior.

```sh
cd server
npm start
```

Configura estas variables de entorno en el servicio de backend:

- `AI_API_BASE_URL`: base URL compatible con OpenAI, por defecto `https://api.openai.com/v1`.
- `AI_API_KEY`: clave secreta del proveedor.
- `AI_MODEL`: nombre exacto de un modelo disponible para esa clave.
- `ALLOWED_ORIGINS`: origen(es) exactos de la interfaz, separados por comas. Por ejemplo `https://TU-USUARIO.github.io`.
- `PORT`: el proveedor de hosting normalmente lo define automáticamente.

El endpoint `GET /api/health` indica si la configuración está completa sin revelar la clave. `POST /api/chat` recibe `{ "messages": [{"role":"user","content":"Hola"}], "assistants": [{"name":"NOVA","role":"Ingeniería","description":"...","backstory":"..."}] }`.

## Publicar la interfaz en GitHub Pages

1. Crea un repositorio público llamado `unnamed-hendrix-chatbots`.
2. Sube el contenido de la carpeta `public/` a la raíz de la rama `main` (o cambia el origen de Pages a `/public` si tu configuración lo permite).
3. En GitHub, abre **Settings → Pages** y selecciona **Deploy from a branch**, rama `main`, carpeta `/ (root)` si subiste el contenido de `public/` a la raíz.
4. Despliega `server/` en un host Node.js y define las variables de entorno anteriores.
5. Abre la web, entra en **Ajustes de API** y guarda la URL del backend.
6. Prueba la conexión y envía un mensaje.

La interfaz no llama directamente al proveedor de IA: el backend guarda la clave y hace la solicitud por ella. No habilites CORS para cualquier origen en un servicio público; limita `ALLOWED_ORIGINS` al dominio de tu app.

## Limitaciones conocidas

- Los chats y asistentes se guardan en `localStorage` del navegador: no se sincronizan entre dispositivos y pueden borrarse al limpiar los datos del navegador.
- El service worker permite abrir la interfaz en caché, pero las respuestas de IA necesitan conexión.
- El backend inicial no incluye cuentas, límites por usuario, cuotas, base de datos ni protección contra abuso. Antes de abrirlo al público, añade autenticación, rate limiting y límites de gasto.
- No hay todavía un modelo local integrado. Esa será una fase posterior, con selección de modelo según la memoria disponible y el rendimiento real del dispositivo.
