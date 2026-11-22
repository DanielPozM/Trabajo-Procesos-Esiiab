---
type: Arquitectura
title: Arquitectura del proyecto
description: Capas del backend y del frontend, frontera exacta entre ellas y tabla de endpoints.
timestamp: 2026-11-22
---

# Arquitectura

La especificación del Sprint 1 solo exige separación cliente-servidor, mismo origen y capas separadas. El resto de tecnologías y su justificación están en el [README](../README.md).

## Backend

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| API / transporte | `src/api/authRoutes.js`, `userRoutes.js`, `matchmakingRoutes.js`, `gameRoutes.js`, `httpErrors.js` | Lee `req.session`, `req.body` y `req.params`; comprueba sesión/rol; traduce errores de negocio a HTTP. |
| Servicios / casos de uso | `src/services/userService.js`, `matchmakingService.js`, `gameService.js`, `emailService.js` | Aplica permisos de negocio y ordena las operaciones. Recibe y devuelve objetos; no conoce Express. |
| Dominio / motor | `src/services/liarsDice.js`, `src/lib/diceColors.js` | Reglas puras: turnos, apuestas, acusaciones, dados y catálogo de colores. Sin E/S. |
| Acceso a datos | `src/repositories/userRepository.js`, `userRepositoryFirestore.js`, `matchmakingRepository.js`, `matchmakingRepositoryFirestore.js`, `sessionStoreFirestore.js` | Persistencia en memoria/fichero o Firestore; transacciones y versionado optimista. |
| Composición | `src/app.js` | Único lugar que elige implementaciones concretas y las inyecta. |
| Arranque | `src/server.js` | Inicia el proceso HTTP. |

## Frontend

| Capa | Archivos | Responsabilidad |
| --- | --- | --- |
| Presentación | `public/index.html`, `public/js/app.js` | DOM, vistas, eventos y estado de interfaz. Pinta lo que devuelve el servidor. |
| Cliente API | `public/js/apiClient.js` | Construye las peticiones HTTP y parsea el JSON. Es la única capa del navegador que hace `fetch`. |

## Frontera exacta entre capas

- **API → servicio:** la API es el único sitio que puede usar `req`/`res` y códigos HTTP. En `userRoutes.js`, `auth` devuelve 401 y la comprobación de rol devuelve 403; después llama a `service.*`.
- **Servicio → repositorio:** el servicio decide *qué* guardar y *cómo reaccionar*; el repositorio decide *cómo* guardar. `MATCH_VERSION_CONFLICT` se detecta en el repositorio y el servicio reintenta.
- **Servicio → dominio:** `gameService.placeBid()` llama a `applyBid()`. El motor recibe el estado, el reloj y el azar por parámetro; no importa Express, Firestore ni `process.env`.
- **Presentación → cliente API:** `app.js` decide qué hacer; `apiClient.js` decide cómo pedirlo. El frontend no accede a Firestore ni ejecuta reglas de juego.
- **Composición:** en `src/app.js` se construyen `UserService`, `MatchmakingService` y `GameService` con sus repositorios y colaboradores. El resto del código recibe las dependencias ya inyectadas.
- **Mismo origen:** `src/app.js` sirve `public` con `express.static('public')` y monta la API bajo `/api`. Toda comunicación cliente-servidor pasa por HTTP/JSON.

Dependencia permitida: presentación → cliente API → API → servicio → repositorio, con dominio/lib como apoyo de los servicios. Las capas internas no importan a las externas.

## Endpoints

Descripción completa de cada operación en el [README](../README.md). "Activo" significa cuenta confirmada o creada por OAuth y no eliminada; lo comprueba `getRequester` en las rutas de juego y emparejamiento.

| Método | Ruta | Quién puede |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Público |
| `POST` | `/api/auth/login` | Público |
| `POST` | `/api/auth/logout` | Público en el código (sin middleware de sesión; destruye la sesión si existe) |
| `GET` | `/api/auth/me` | Autenticado |
| `GET` | `/api/auth/verify-email` | Público |
| `POST` | `/api/auth/resend-verification` | Público |
| `GET` | `/api/auth/oauth/google` | Público |
| `GET` | `/api/auth/oauth/google/callback` | Público |
| `GET` | `/api/users` | Solo administrador |
| `GET` | `/api/users/me/dice-colors` | Autenticado |
| `PATCH` | `/api/users/me/dice-color` | Autenticado |
| `GET` | `/api/users/:id/active` | Solo administrador |
| `DELETE` | `/api/users/:id` | Administrador o el propio usuario |
| `POST` | `/api/matchmaking/join` | Autenticado y activo |
| `GET` | `/api/matchmaking/status` | Autenticado y activo |
| `POST` | `/api/matchmaking/leave` | Autenticado y activo |
| `GET` | `/api/matchmaking/matches/:id` | Jugador de esa partida |
| `GET` | `/api/matches/:id` | Jugador de esa partida |
| `POST` | `/api/matches/:id/bids` | Jugador de la partida con el turno |
| `POST` | `/api/matches/:id/challenge` | Jugador de la partida con el turno |
| `POST` | `/api/matches/:id/abandon` | Jugador de esa partida |

Los permisos anteriores se aplican en el servidor según el código citado y se describen también en el README.
