---
type: Decisiones
title: Decisiones de diseño
description: Decisiones detectadas en el código, el README y el historial, con su fuente y estado.
timestamp: 2026-11-22
---

# Decisiones

El motivo se cita cuando aparece en una fuente comprobable o cuando lo ha aportado el alumno. El estado es `vigente` salvo que el historial muestre un cambio de enfoque.

## D-01 — Node.js 20, Express y módulos ES

- **Qué se decidió:** servidor HTTP y API con Node.js 20 + Express 4; JavaScript ES Modules en backend y frontend.
- **Por qué:** README: «Ecosistema maduro, ligero y con separación sencilla entre rutas, servicios y repositorios» y «un solo lenguaje en todo el proyecto y módulos nativos sin necesidad de bundler».
- **Estado:** vigente.

## D-02 — Separación en capas e inyección de dependencias

- **Qué se decidió:** API, servicios, dominio y repositorios en archivos distintos; `src/app.js` elige las implementaciones concretas y las inyecta por constructor.
- **Por qué:** README: «la capa de negocio no conoce Express: recibe y devuelve objetos» y «la capa de datos se puede sustituir (memoria/fichero/Firestore) sin cambiar la lógica». Especificación del Sprint 1, apartado 3.2.
- **Estado:** vigente.

## D-03 — Datos en memoria en los primeros hitos

- **Qué se decidió:** empezar con `src/repositories/userRepository.js` en memoria mientras se construían la lógica, la API y el frontend.
- **Por qué:** especificación del Sprint 1, apartado 10, hitos 1 y 2: «los datos siguen en memoria».
- **Estado:** sustituida por D-06 en el Hito 3. El repositorio en memoria se conserva para desarrollo y pruebas.

## D-04 — Sesiones con `express-session`

- **Qué se decidió:** cookie HttpOnly, SameSite Lax y `Secure` en producción; regeneración de sesión al autenticar.
- **Por qué:** README: «mantiene la sesión entre recargas mediante cookie HttpOnly y permite regenerar la sesión al autenticar».
- **Estado:** vigente.

## D-05 — Hash de contraseñas con `bcryptjs`

- **Qué se decidió:** guardar un hash con salt y coste configurable, nunca la contraseña en claro.
- **Por qué:** README: «algoritmo específico para contraseñas, con salt y coste configurable; nunca se guarda la contraseña en claro».
- **Estado:** vigente.

## D-06 — Firestore como persistencia real

- **Qué se decidió:** usar `UserRepositoryFirestore` y `FirestoreSessionStore` en producción; mantener las implementaciones en memoria/fichero para local y pruebas. Los nombres de colecciones y variables de configuración son genéricos y ajustables.
- **Por qué:** porque era la opción más práctica: persistencia real gestionada, capa gratuita y buena integración con Cloud Run, según el README. La especificación del Sprint 1, apartado 10, Hito 3, pedía sustituir la memoria sin cambiar la lógica. Los nombres genéricos evitan ligar el código a un nombre concreto de colección o entorno.
- **Estado:** vigente; sustituye D-03.

## D-07 — Administrador inicial desde entorno y script de reset

- **Qué se decidió:** crear/promocionar el primer administrador al arrancar si existen `INIT_ADMIN_*`, y ofrecer `npm run reset-admin` como apoyo.
- **Por qué:** elegí nombres genéricos para las variables del administrador, de modo que el mismo arranque sirva para cualquier cuenta y no quede atado a un correo concreto; es la forma más práctica de dejar la credencial fuera del repositorio. La especificación del Sprint 1, apartado 4.2, permite elegir el mecanismo y pide poder justificarlo.
- **Estado:** vigente. El historial muestra un intento y su revert en `3ef6eef`, `c35b514`, `52ce1be` y `e25fa71`; ambos cambios y sus reversiones constan en el historial.

## D-08 — OAuth con Google

- **Qué se decidió:** flujo Authorization Code con `state` en sesión y verificación del correo del proveedor.
- **Por qué:** por comodidad: Google era el proveedor que tenía a mano y su flujo encajaba directamente con lo que pedía la especificación. README: «Flujo Authorization Code con `state` y verificación del email de Google».
- **Estado:** vigente.

## D-09 — Confirmación por correo con Nodemailer/SMTP

- **Qué se decidió:** enviar el enlace de confirmación por SMTP con Nodemailer; en local, si no hay proveedor, el enlace se imprime en la consola; en producción, sin SMTP el registro falla con `EMAIL_NOT_CONFIGURED`.
- **Por qué:** README: «envío de la confirmación de cuenta por SMTP con cualquier proveedor con capa gratuita» y «en local, si no configuras SMTP, el enlace de confirmación se imprime en la consola del servidor. Es la forma recomendada de probar el flujo sin enviar correos reales».
- **Estado:** vigente. El proveedor y sus valores se gestionan fuera del repositorio; ver README y el script de despliegue.

## D-10 — Despliegue en Cloud Run con contenedor y script propio

- **Qué se decidió:** `Dockerfile` para Cloud Run y, como alternativa reproducible, `scripts/deploy_cloudrun.sh`, que guarda secretos en Secret Manager y los inyecta al servicio.
- **Por qué:** el despliegue conectado al repositorio publica automáticamente cada cambio que llega a `main`. El script sirve para desplegar también desde la terminal cuando se quiere controlar el proceso o actualizar secretos: construye la imagen, crea o actualiza los secretos en Secret Manager y arranca el servicio en Cloud Run con esas variables. Si no se define `SESSION_SECRET` genera uno, y deduce la URI de retorno OAuth a partir de `APP_BASE_URL`. Así no depende de un único mecanismo para publicar. README: «alternativa reproducible [...] despliega sin incluir credenciales en el código».
- **Estado:** vigente.

## D-11 — Cola de emparejamiento en un único documento

- **Qué se decidió:** un documento único de cola con un array de entradas y transacciones para `enqueueOrMatch`, `getStatus` y `leave`; TTL de 2 minutos y candidato más antiguo.
- **Por qué:** `docs/memoria-sprint2.md`, apartado 5.2: «el emparejamiento debe ser atómico: leer la cola, elegir rival y crear la partida tienen que ocurrir en la misma transacción» y «así una pestaña cerrada no bloquea la cola».
- **Estado:** vigente.

## D-12 — Motor del juego puro

- **Qué se decidió:** `src/services/liarsDice.js` recibe estado, reloj y azar por parámetro y devuelve un estado nuevo; los servicios orquestan y los repositorios guardan.
- **Por qué:** `docs/memoria-sprint2.md`, apartados 4.1 y 4.2: «no escribe en base de datos ni lee variables de entorno. Esto permite probarlo con un reloj y un generador aleatorio inyectados».
- **Estado:** vigente.

## D-13 — Versionado optimista de partidas

- **Qué se decidió:** campo `version` y `expectedVersion` en cada escritura; conflicto `MATCH_VERSION_CONFLICT` y reintento del servicio.
- **Por qué:** `docs/memoria-sprint2.md`, apartado 4.3: «evita que dos jugadores pisen la misma jugada y que una mesa abierta a la vez por ambos genere dos repartos de dados distintos».
- **Estado:** vigente.

## D-14 — Recompensas idempotentes y color congelado

- **Qué se decidió:** `claimDiceReward()` devuelve el premio anterior si ya existe entrada para la partida; el color elegido se copia a `players[].diceColor` al crear la partida.
- **Por qué:** `docs/memoria-sprint2.md`, apartados 8.3 y 8.4: dos peticiones simultáneas no deben duplicar el premio y «cambiar de color después de emparejarse no altera la partida en curso».
- **Estado:** vigente.

## D-15 — Abandono resuelto en el servidor

- **Qué se decidió:** `POST /api/matches/:id/abandon` cierra la partida, da la victoria al rival y no permite reabrirla.
- **Por qué:** `docs/memoria-sprint2.md`, apartado 9, y PR #16: corrección del problema reportado al volver al panel durante una partida.
- **Estado:** vigente.
