# Gestión de Usuarios y Dado Mentiroso — Sprints 1 y 2

Aplicación SaaS de gestión de usuarios con registro local, confirmación de cuenta por correo, inicio de sesión con Google (OAuth 2.0), sesiones persistentes, roles de usuario/administrador y persistencia en Firestore.

- **Repositorio:** https://github.com/DanielPozM/Trabajo-Procesos-Esiiab
- **Aplicación desplegada:** https://trabajoprocesosdmp-154093406430.europe-west1.run.app

## Tecnologías y justificación

| Tecnología | Uso | Justificación |
| --- | --- | --- |
| Node.js 20 + Express 4 | Servidor HTTP y API | Ecosistema maduro, ligero y con separación sencilla entre rutas, servicios y repositorios. |
| JavaScript ES Modules | Backend y frontend | Un solo lenguaje en todo el proyecto y módulos nativos sin necesidad de bundler. |
| express-session | Sesiones | Mantiene la sesión entre recargas mediante cookie HttpOnly y permite regenerar la sesión al autenticar. |
| bcryptjs | Hash de contraseñas | Algoritmo específico para contraseñas, con salt y coste configurable; nunca se guarda la contraseña en claro. |
| Google Cloud Firestore | Base de datos | Persistencia real gestionada, capa gratuita y buena integración con Cloud Run. |
| Nodemailer | Correo transaccional | Envío de la confirmación de cuenta por SMTP con cualquier proveedor con capa gratuita. |
| Google OAuth 2.0 | Proveedor externo | Flujo Authorization Code con `state` y verificación del email de Google. |
| HTML + CSS + JavaScript | Frontend | Interfaz sin framework, separada en presentación (`index.html`) y cliente API (`apiClient.js`). |
| GitHub Actions | Integración continua | Ejecuta las pruebas en cada push y pull request. |
| Docker + Cloud Run | Despliegue | Contenedor reproducible y URL pública con capa gratuita. |

## Arquitectura por capas

```
Navegador
  ├─ presentación: public/index.html + public/js/app.js
  └─ cliente API:  public/js/apiClient.js
          │  HTTP/JSON (mismo origen)
          ▼
API HTTP: src/api/authRoutes.js, src/api/userRoutes.js,
          src/api/matchmakingRoutes.js, src/api/gameRoutes.js
          │
          ▼
Lógica de negocio: src/services/userService.js
                   src/services/matchmakingService.js
                   src/services/gameService.js
                   src/services/liarsDice.js (motor puro del juego)
          │
          ▼
Acceso a datos: src/repositories/userRepository.js
                src/repositories/userRepositoryFirestore.js
                src/repositories/matchmakingRepository.js
                src/repositories/matchmakingRepositoryFirestore.js
                src/repositories/sessionStoreFirestore.js
```

- El frontend **nunca** accede a Firestore ni ejecuta reglas de negocio.
- La capa API solo traduce HTTP a llamadas al servicio y errores de negocio a códigos HTTP.
- La capa de negocio no conoce Express: recibe y devuelve objetos.
- La capa de datos se puede sustituir (memoria/fichero/Firestore) sin cambiar la lógica.
- `src/app.js` compone las dependencias; `src/server.js` arranca el proceso.

### Estructura

```
src/
  api/            rutas HTTP y traducción de errores
  services/       reglas de negocio y envío de correo
  repositories/   persistencia de usuarios, sesiones y emparejamiento
  lib/            logger
  config.js       lectura centralizada de variables de entorno
  app.js          composición de la aplicación Express
  server.js       arranque del servidor
public/
  index.html      capa de presentación
  js/app.js       lógica de interfaz
  js/apiClient.js cliente de la API
tests/            pruebas unitarias de la capa de negocio
scripts/          administrador inicial y despliegue
```

## Ejecución local

Requisitos: **Node.js 20 o superior** y npm.

```bash
npm install
cp .env.example .env      # En Windows: copy .env.example .env
# Edita .env con tus valores locales
npm start
```

La aplicación queda en `http://localhost:3000` (o el `PORT` configurado).

Para desarrollo con recarga automática:

```bash
npm run dev
```

### Persistencia en local

- Por defecto se usa memoria si `DB_FILE` no está definido, útil para pruebas rápidas.
- Para persistir en un fichero JSON: `DB_FILE=data/users.json`.
- Para usar Firestore: `DB_TYPE=firestore` (o definir `FIRESTORE_COLLECTION`) y credenciales de Google Cloud.

## Pruebas

```bash
npm test
```

Las pruebas son unitarias, automatizadas y se ejecutan con un único comando. Cubren, entre otros casos:

- registro con email inválido, duplicado o contraseña corta;
- contraseña almacenada con hash;
- cuenta pendiente que no puede iniciar sesión;
- confirmación con token válido, inválido y caducado;
- reenvío de confirmación y rotación del token;
- listado sin datos sensibles;
- comprobación de usuario activo;
- usuario normal que intenta eliminar a otro;
- usuario que elimina su propia cuenta;
- administrador que elimina a otro usuario;
- creación de cuenta OAuth activa;
- OAuth que activa una cuenta local pendiente sin cambiar su rol;
- creación del administrador inicial desde variables de entorno;
- jugador que entra en la cola y queda en espera;
- emparejamiento de dos jugadores en una partida;
- ambos jugadores consultan la misma partida;
- jugador que no se empareja consigo mismo;
- salida de la cola y caducidad de entradas;
- acceso a la partida restringido a sus jugadores;
- respuestas de emparejamiento sin datos sensibles;
- reparto de cuatro dados por jugador y turno inicial;
- turnos, apuestas válidas y apuestas rechazadas;
- acusación con apuesta verdadera y con apuesta falsa;
- pérdida de un dado por ronda y fin de partida al quedarse sin dados;
- vista privada que oculta los dados del rival;
- apertura simultánea de la mesa por ambos jugadores;
- acciones inválidas que no modifican la partida;
- sorteo de colores, desbloqueo idempotente y selección de color.

## Reglas del dado mentiroso

- Cada jugador empieza con **4 dados de 6 caras**; solo ve los suyos.
- El primer turno de la partida es aleatorio. En las rondas siguientes empieza el ganador de la ronda anterior.
- En cada turno se puede **subir la apuesta** (cantidad y cara) o **acusar de mentira**.
- Una apuesta es válida si sube la cantidad, o mantiene la cantidad y sube la cara. La cantidad nunca puede superar el total de dados en juego.
- Al acusar se revelan ambas manos. Si hay **menos dados** de la cara apostada que la cantidad indicada, pierde un dado quien apostó; en caso contrario, pierde un dado quien acusó.
- La partida termina cuando un jugador se queda sin dados; gana el otro.
- Toda la lógica vive en el servidor: el navegador nunca recibe los dados del rival antes de una acusación.

## Recompensas de color

El dado gris es el color base y está disponible desde el principio. Al ganar una partida se hace **una tirada de recompensa**:

| Color | Probabilidad |
| --- | --- |
| Verde | 50 % |
| Azul | 20 % |
| Morado | 10 % |
| Amarillo | 5 % |
| Rojo | 4 % |
| Rosa | 1 % |
| Sin premio | 10 % |

Los colores desbloqueados quedan guardados en el perfil. Antes de buscar partida se elige uno desde **Personalizar dado**; ese color se guarda en la partida y ambos jugadores lo ven en la mesa. La concesión es idempotente por jugador y partida: reintentar una petición o consultar la partida terminada no duplica desbloqueos ni vuelve a sortear.

## Variables de entorno

El repositorio incluye `.env.example` con los **nombres** de las variables, sin valores reales.

| Variable | Para qué se usa |
| --- | --- |
| `PORT` | Puerto HTTP. |
| `APP_BASE_URL` | URL base para enlaces de confirmación y redirecciones OAuth. |
| `SESSION_SECRET` | Firma de la cookie de sesión. Obligatoria en producción. |
| `DB_TYPE` | `firestore` para forzar Firestore; si se omite, se usa el repositorio local. |
| `DB_FILE` | Ruta del fichero JSON cuando se usa persistencia en fichero. |
| `GOOGLE_APPLICATION_CREDENTIALS` | Ruta a la clave de servicio de Google Cloud en local. |
| `GOOGLE_CLOUD_PROJECT` | Proyecto de Google Cloud. |
| `FIRESTORE_DATABASE_ID` | Base de datos de Firestore. |
| `FIRESTORE_COLLECTION` | Colección de usuarios. |
| `SESSION_COLLECTION` | Colección de sesiones en Firestore. |
| `MATCHMAKING_TTL_SECONDS` | Segundos que una entrada permanece válida en la cola. |
| `MATCHMAKING_COLLECTION` | Colección de la cola de emparejamiento. |
| `MATCHES_COLLECTION` | Colección de partidas creadas. |
| `INIT_ADMIN_EMAIL` | Email del administrador inicial. |
| `INIT_ADMIN_PASSWORD` | Contraseña del administrador inicial. |
| `GOOGLE_CLIENT_ID` | Client ID de OAuth. |
| `GOOGLE_CLIENT_SECRET` | Client Secret de OAuth. |
| `GOOGLE_REDIRECT_URI` | URI de retorno registrada en Google. |
| `SMTP_HOST` | Servidor SMTP del proveedor de correo. |
| `SMTP_PORT` | Puerto SMTP. |
| `SMTP_SECURE` | `true` para TLS directo (normalmente puerto 465). |
| `SMTP_USER` | Usuario SMTP. |
| `SMTP_PASS` | Contraseña o API key SMTP. |
| `MAIL_FROM` | Remitente de los correos. |
| `VERIFICATION_TOKEN_TTL_MINUTES` | Caducidad del enlace de confirmación. |

> `SESSION_SECRET`, `INIT_ADMIN_PASSWORD`, `GOOGLE_CLIENT_SECRET` y `SMTP_PASS` son secretos: no deben subirse al repositorio.

## Configurar el correo de confirmación

El registro local crea la cuenta en estado **pendiente**. Para activarla, el usuario debe abrir el enlace enviado por correo.

1. Crea una cuenta en un proveedor SMTP transaccional con capa gratuita (por ejemplo, Brevo, Resend o Mailgun).
2. Configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM`.
3. En local, si no configuras SMTP, el enlace de confirmación se imprime en la consola del servidor. Es la forma recomendada de probar el flujo sin enviar correos reales.
4. En producción, sin SMTP configurado el registro devuelve un error claro (`EMAIL_NOT_CONFIGURED`) en lugar de dejar cuentas imposibles de activar.
5. Revisa la carpeta de spam al probar.

El token se guarda **hasheado** en la base de datos, caduca a las 24 horas por defecto y se invalida al confirmar la cuenta.

## Configurar OAuth con Google

1. En Google Cloud Console, crea un **OAuth client ID** de tipo *Web application*.
2. Registra exactamente estas URI de retorno:
   - Desarrollo: `http://localhost:3000/api/auth/oauth/google/callback`
   - Producción: `https://trabajoprocesosdmp-154093406430.europe-west1.run.app/api/auth/oauth/google/callback`
3. Define `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` y `GOOGLE_REDIRECT_URI`.
4. La URI debe coincidir al carácter con la configurada en Google (protocolo, dominio, puerto y ruta).

El flujo usa el parámetro `state` guardado en la sesión para prevenir CSRF. Si Google devuelve un email verificado, la cuenta se crea activa; si ya existía una cuenta local pendiente con ese email, se activa y se conserva su contraseña y su rol.

## Acceso como administrador

El primer administrador se crea o promociona al arrancar el servidor cuando existen `INIT_ADMIN_EMAIL` e `INIT_ADMIN_PASSWORD`.

También se puede preparar explícitamente:

```bash
# Define ADMIN_EMAIL y ADMIN_PASSWORD en el entorno (o INIT_ADMIN_*)
npm run reset-admin
```

El script actualiza la contraseña, activa la cuenta y le asigna el rol `admin`. **Las credenciales de prueba se envían junto con la entrega; no se publican en el repositorio.**

## API

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Público | Crea una cuenta pendiente y envía el correo de confirmación. |
| `POST` | `/api/auth/login` | Público | Inicia sesión local y regenera la sesión. |
| `POST` | `/api/auth/logout` | Autenticado | Destruye la sesión y limpia la cookie. |
| `GET` | `/api/auth/me` | Autenticado | Devuelve el usuario de la sesión. |
| `GET` | `/api/auth/verify-email?token=...` | Público | Confirma la cuenta y redirige al frontend. |
| `POST` | `/api/auth/resend-verification` | Público | Reenvía el correo si la cuenta sigue pendiente. |
| `GET` | `/api/auth/oauth/google` | Público | Inicia el flujo OAuth con Google. |
| `GET` | `/api/auth/oauth/google/callback` | Público | Callback de Google. |
| `GET` | `/api/users` | Solo admin | Lista usuarios con email, rol y estado. |
| `GET` | `/api/users/:id/active` | Solo admin | Comprueba si un usuario está activo. |
| `GET` | `/api/users/me/dice-colors` | Autenticado | Catálogo de colores, desbloqueo y selección actual. |
| `PATCH` | `/api/users/me/dice-color` | Autenticado | Selecciona un color desbloqueado `{ colorId }`. |
| `DELETE` | `/api/users/:id` | Admin o el propio usuario | Elimina una cuenta. |
| `POST` | `/api/matchmaking/join` | Autenticado | Entra en la cola o devuelve la partida asignada. |
| `GET` | `/api/matchmaking/status` | Autenticado | Consulta si el jugador espera o ya tiene partida. |
| `POST` | `/api/matchmaking/leave` | Autenticado | Sale de la cola de espera. |
| `GET` | `/api/matchmaking/matches/:id` | Jugadores de la partida | Consulta una partida concreta. |
| `GET` | `/api/matches/:id` | Jugadores de la partida | Estado privado de la partida (dados propios). |
| `POST` | `/api/matches/:id/bids` | Jugador con el turno | Registra una apuesta `{ quantity, face }`. |
| `POST` | `/api/matches/:id/challenge` | Jugador con el turno | Acusa de mentira y resuelve la ronda. |

Estados de cuenta:

- **Pendiente:** registrada por email, sin confirmar. No puede iniciar sesión.
- **Activo:** email confirmado o cuenta creada mediante OAuth.
- **Eliminado:** el documento desaparece; no puede volver a iniciar sesión.

Los errores de negocio se devuelven como `{ "error": "CODIGO" }` y el frontend los traduce a mensajes claros en español.

## Seguridad

- Contraseñas con `bcrypt` (nunca en texto plano).
- Tokens de confirmación aleatorios, guardados hasheados y con caducidad.
- Cookies `HttpOnly`, `SameSite=Lax` y `Secure` en producción.
- Regeneración de sesión al iniciar sesión (local y OAuth).
- Autorización comprobada en el servidor: ocultar botones no es suficiente.
- `state` en OAuth para prevenir CSRF.
- Secretos fuera del repositorio; `.env.example` solo contiene nombres.
- Listados y respuestas `me` sin `passwordHash` ni tokens.
- Los dados del rival no se envían al navegador hasta que se revelan en una acusación.
- Acciones de juego validadas en el servidor (turno, apuesta y propiedad de la partida).
- Control optimista de versión para que dos jugadores no pisen la misma jugada.
- Los colores solo se pueden seleccionar si están desbloqueados; el servidor lo comprueba siempre.
- El premio de cada partida se concede con una operación idempotente por jugador y partida.
- Límite de tamaño del cuerpo JSON y respuestas de error sin trazas internas.

## Integración y despliegue continuo

- **CI:** `.github/workflows/ci.yml` ejecuta `npm ci` y `npm test` en cada push y pull request.
- **CD:** el servicio de Cloud Run está conectado al repositorio para desplegar los cambios de `main`. Como alternativa reproducible, `scripts/deploy_cloudrun.sh` construye la imagen, guarda los secretos en Secret Manager y despliega sin incluir credenciales en el código. El script genera `SESSION_SECRET` si no se proporciona y deduce `GOOGLE_REDIRECT_URI` a partir de `APP_BASE_URL`.

El flujo de trabajo sigue GitHub Flow: rama por cambio, pruebas en local, pull request y merge a `main`.

## Solución de problemas

- **No llega el correo:** revisa spam, la configuración SMTP y `MAIL_FROM`. En local, mira la consola del servidor para obtener el enlace.
- **Google devuelve `redirect_uri_mismatch`:** la URI registrada no coincide exactamente con `GOOGLE_REDIRECT_URI`.
- **La sesión no se mantiene en Cloud Run:** comprueba `SESSION_SECRET` y que la colección de sesiones sea accesible. En producción se usa Firestore como almacén de sesiones.
- **Error de Firestore al arrancar:** revisa `GOOGLE_CLOUD_PROJECT`, `FIRESTORE_DATABASE_ID` y los permisos `roles/datastore.user` del service account.
- **La primera petición tarda:** Cloud Run puede arrancar en frío tras un periodo de inactividad.

## Hitos del Sprint 1

- **Hito 1:** esqueleto, capas, API y pruebas en memoria.
- **Hito 2:** frontend separado, registro/login local, hash, sesión y rutas protegidas.
- **Hito 3:** Firestore, secretos por entorno, roles, autorización y logging.
- **Hito 4:** OAuth con Google, confirmación de cuenta por correo, feedback de errores, README final y revisión de seguridad.

## Hitos del Sprint 2

- **Hito 1:** cola de emparejamiento con transacciones en Firestore, API y pantalla de búsqueda. Al encontrar oponente se muestra una mesa provisional; el juego completo llega en el siguiente hito.
- **Hito 2:** lógica completa del dado mentiroso (turnos, apuestas, mentiras, pérdida de dados y fin de partida).
- **Hito 3:** estética pirata, menú principal con `JUGADORES`, `BUSCAR OPONENTE` y `PERSONALIZAR DADO`, y mesa de juego refinada.
- **Hito 4:** premios de colores al ganar, desbloqueo y selección del color de los dados.
