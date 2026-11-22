---
type: Requisitos
title: Requisitos del Sprint 1
description: Estado de los requisitos de la especificación del Sprint 1 con evidencia del repositorio.
timestamp: 2026-11-22
---

# Requisitos

Estado comparado con la especificación del Sprint 1 facilitada con el prompt. `hecho` = se cumple con evidencia; `parcial` = se cumple una parte; `pendiente` = no se cumple o solo hay una solución provisional. Los requisitos funcionales del Sprint 2 se documentan en [sprint-2.md](sprint-2.md).

| ID | Requisito | Estado | Evidencia |
| --- | --- | --- | --- |
| ARQ-01 | Separación cliente-servidor y mismo origen | hecho | `src/app.js`: API bajo `/api` y `express.static('public')`; `public/js/apiClient.js` usa HTTP/JSON. |
| ARQ-02 | Capas del backend: API, lógica y datos | hecho | `src/api/`, `src/services/` y `src/repositories/` separados; composición en `src/app.js`. |
| ARQ-03 | Capas del frontend: presentación y comunicación | hecho | `public/index.html` + `public/js/app.js` frente a `public/js/apiClient.js`. |
| RF-01 | Registro de usuario local | hecho | `POST /api/auth/register` en `src/api/authRoutes.js`; `UserService.register()`; `tests/userService.test.js`. La cuenta queda pendiente hasta confirmarse. |
| RF-02 | Confirmación de cuenta por correo | hecho | `src/services/emailService.js` envía por Nodemailer; `UserService._sendVerification()` y `verifyEmail()`; secretos inyectados por `scripts/deploy_cloudrun.sh`; `tests/userService.test.js`. El proveedor SMTP se configura fuera del repositorio; ver README. |
| RF-03 | Inicio de sesión local | hecho | `POST /api/auth/login`; `UserService.authenticate()`; regeneración de sesión en `authRoutes.js`; `tests/userService.test.js` y `tests/auth.test.js`. |
| RF-04 | Inicio de sesión con OAuth | hecho | `GET /api/auth/oauth/google` y su callback; `UserService.loginWithOAuth()`; `tests/userService.test.js`. El proveedor y las URI de retorno se configuran fuera del repositorio; ver README. |
| RF-05 | Cierre de sesión | hecho | `POST /api/auth/logout` destruye la sesión y limpia la cookie. |
| RF-06 | Mantenimiento de la sesión entre recargas | hecho | `express-session` en `src/app.js` con cookie HttpOnly, SameSite Lax y duración configurada; `FirestoreSessionStore` en producción. |
| RF-07 | Listar usuarios (administrador) | hecho | `GET /api/users` con comprobación `role !== 'admin'` → 403 en `src/api/userRoutes.js`; `UserService.listUsers()` sin campos sensibles. |
| RF-08 | Comprobar si un usuario está activo (administrador) | hecho | `GET /api/users/:id/active` con comprobación de rol en `userRoutes.js`; `UserService.isActive()`; `tests/userService.test.js`. |
| RF-09 | Eliminar usuario | hecho | `DELETE /api/users/:id`; `UserService.deleteUser()` aplica admin o propio usuario; `tests/userService.test.js`. |
| RF-10 | Creación del primer administrador | hecho | `UserService._ensureInitialAdmin()` arranca desde variables de entorno; `scripts/reset_admin.js` y `npm run reset-admin` en el README; `tests/userService.test.js`. |
| RNF-01 | Persistencia en una base de datos real | hecho | `UserRepositoryFirestore` y `FirestoreSessionStore` seleccionados en producción en `src/app.js`; `src/repositories/`. La memoria/fichero queda para desarrollo y pruebas. |
| RNF-02 | Secretos fuera del código y `.env.example` | hecho | `.env.example` solo contiene nombres; `src/config.js` lee entorno; `scripts/deploy_cloudrun.sh` guarda secretos en Secret Manager. Los valores reales se gestionan fuera del repositorio. |
| RNF-03 | Hash seguro de contraseñas | hecho | `bcryptjs` en `src/services/userService.js`; `tests/userService.test.js` comprueba hash y login. |
| RNF-04 | Rutas protegidas por sesión y rol | hecho | `auth` en `src/api/userRoutes.js`, `matchmakingRoutes.js` y `gameRoutes.js`; comprobación de rol en listado y estado activo; reglas de pertenencia en los servicios. |
| RNF-05 | Despliegue en cloud con URL pública | hecho | README documenta la URL de Cloud Run; `Dockerfile` y `scripts/deploy_cloudrun.sh`; PR #5, #6 y #11. |
| RNF-06 | Pruebas unitarias de la lógica (5 o más) | hecho | `npm test`: 68 pruebas, 0 fallos. Distribución: `userService` 21, `liarsDice` 17, `gameService` 12, `matchmaking` 9, `diceColors` 6, `auth` 3. Incluye casos de error. |
| RNF-07 | Manejo de errores con feedback al usuario | hecho | `src/api/httpErrors.js` traduce códigos de negocio; `src/app.js` maneja JSON inválido, tamaño excedido y error interno; el frontend traduce los códigos a mensajes. |
| RNF-08 | Registro de actividad (log) | hecho | `src/lib/logger.js`; llamadas en rutas, servicios y composición. |
| PRO-01 | Flujo de trabajo GitHub Flow | hecho | 17 commits de merge de pull request en `main` (`git log --first-parent --merges`). El historial de ramas y PRs es la evidencia del flujo. |
| PRO-02 | Integración continua | hecho | `.github/workflows/ci.yml`: `on: [push, pull_request]`, `npm ci` y `npm test`. |
| PRO-03 | Despliegue continuo | hecho | README describe Cloud Run conectado al repositorio; `scripts/deploy_cloudrun.sh` como alternativa reproducible. |

## Notas

- No se han marcado requisitos como `parcial` ni `pendiente`: la ruta de correo existente usa un proveedor SMTP real y los secretos se inyectan desde fuera del repositorio.
- RF-01 se evalúa por separado de RF-02: el registro crea la cuenta pendiente y RF-02 describe su confirmación.
- Los requisitos nuevos del Sprint 2 no alteran estos ID; se documentan con ID `S2-*` en [sprint-2.md](sprint-2.md).
- Las cifras de pruebas salen de `npm test` y del recuento de `test(` en `tests/*.test.js`.
- El proyecto termina en el Sprint 2; no hay requisitos pendientes ni un Sprint 3 previsto.
