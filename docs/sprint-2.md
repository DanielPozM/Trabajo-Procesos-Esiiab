---
type: Sprint
title: Sprint 2
description: Objetivos, requisitos funcionales, hitos y estado del Sprint 2 documentados de forma retroactiva.
timestamp: 2026-11-22
---

# Sprint 2

**Objetivo:** Por definir.

No hubo criterios de aceptación formales: el objetivo era tener un producto jugable al final del sprint. Este apartado se ha reconstruido de forma retroactiva a partir del código, el [README](../README.md), el historial de Git y [memoria-sprint2.md](memoria-sprint2.md). Los ID `S2-*` son la nomenclatura de este bundle para agrupar lo implementado.

## Requisitos que pasan del Sprint 1

Siguen vigentes todos los ID de [requisitos.md](requisitos.md): la arquitectura por capas, la gestión de usuarios, las sesiones, los roles, la persistencia y el CI/CD se reutilizan sin cambiar de estado. El Hito 1 del Sprint 2 partió de esa base, según `docs/memoria-sprint2.md`, apartado 2.1.

## Requisitos funcionales del Sprint 2

| ID | Requisito | Estado | Evidencia |
| --- | --- | --- | --- |
| S2-01 | Cola de emparejamiento: dos jugadores que buscan a la vez quedan emparejados sin carreras ni dobles partidas | hecho | PR #12; `src/repositories/matchmakingRepository*.js`, `src/services/matchmakingService.js`, `tests/matchmaking.test.js`. |
| S2-02 | Estado de la búsqueda, salida de la cola y caducidad de entradas | hecho | `GET /api/matchmaking/status`, `POST /api/matchmaking/leave`, `MATCHMAKING_TTL_SECONDS`; `tests/matchmaking.test.js`. |
| S2-03 | Consulta de partida restringida a sus jugadores y respuesta sin datos internos | hecho | `MatchmakingService.getMatch()` lanza `FORBIDDEN` si el usuario no pertenece; `publicMatch()`; `tests/matchmaking.test.js`. |
| S2-04 | Partida completa del dado mentiroso: reparto, turnos, apuestas, acusaciones, pérdida de dados y fin de partida | hecho | PR #13; `src/services/liarsDice.js`, `src/services/gameService.js`, `tests/liarsDice.test.js` (17), `tests/gameService.test.js` (12), `POST /api/matches/:id/bids` y `/challenge`. |
| S2-05 | Vista privada: cada jugador ve solo sus dados hasta una acusación | hecho | `toPublicGame()` en el motor; `GET /api/matches/:id`; README y `tests/liarsDice.test.js`. |
| S2-06 | Acciones inválidas no modifican la partida; control optimista de versión | hecho | `saveGame()` con `expectedVersion`, conflicto `MATCH_VERSION_CONFLICT` y reintento en el servicio; `tests/gameService.test.js`. |
| S2-07 | Apertura simultánea de la mesa sin doble reparto de dados | hecho | Versionado optimista y creación perezosa en `src/services/gameService.js`; `tests/gameService.test.js`. |
| S2-08 | Interfaz definitiva: estética pirata y menú con `JUGADORES`, `BUSCAR OPONENTE` y `PERSONALIZAR DADO` | hecho | PR #14; `public/index.html`; README, apartado «Hitos del Sprint 2». |
| S2-09 | Mesa de juego integrada en la interfaz y usable desde el navegador | hecho | PR #14 modifica `public/index.html`; README describe la mesa de juego. |
| S2-10 | Recompensa de colores al ganar, con probabilidades documentadas | hecho | PR #15; `src/lib/diceColors.js` y `rollDiceColor()`; README; `tests/diceColors.test.js` (6). |
| S2-11 | Desbloqueo persistente e idempotente, selección previa a la partida y color congelado en la partida | hecho | PR #15; `claimDiceReward()` y `selectDiceColor()`; `GET /api/users/me/dice-colors` y `PATCH /api/users/me/dice-color`; `tests/userService.test.js` (21). |
| S2-12 | Abandono de partida al volver al panel: gana el rival y la partida no se reabre | hecho | PR #16 (`7aaf86f`); `POST /api/matches/:id/abandon`, `applyAbandon()` y `tests/gameService.test.js`; README. |
| S2-13 | Memoria detallada del Sprint 2 integrada en el repositorio | hecho | PR #17 (`de68a92`); [memoria-sprint2.md](memoria-sprint2.md). |

## Hitos y pull requests

| Hito | Contenido | PR | Commit de merge | Fecha |
| --- | --- | --- | --- | --- |
| 1 | Emparejamiento y cola de partidas | [#12](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/12) | `5026603` | 2026-11-11 |
| 2 | Motor del dado mentiroso | [#13](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/13) | `3c2b741` | 2026-11-11 |
| 3 | Estética pirata, menú y mesa | [#14](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/14) | `620d0a6` | 2026-11-11 |
| 4 | Recompensas y color de dados | [#15](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/15) | `8572da7` | 2026-11-13 |
| Extra | Corrección del abandono de partida | [#16](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/16) | `7aaf86f` | 2026-11-13 |
| Documentación | Memoria del Sprint 2 | [#17](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/17) | `de68a92` | 2026-11-13 |

## Pruebas

`npm test`: 68 pruebas, 68 aciertos, 0 fallos. De las 21 pruebas de `userService.test.js`, 17 de `liarsDice.test.js`, 12 de `gameService.test.js` y 9 de `matchmaking.test.js`, varias cubren los requisitos S2-01 a S2-12 anteriores; el reparto completo está en [requisitos.md](requisitos.md).

## Cierre del sprint

- El objetivo era un producto jugable al final del sprint; no se definieron criterios de aceptación formales ni requisitos adicionales.
- El seguimiento se hizo mediante los PRs #12–#17 y sus commits; no se usaron etiquetas de hito.
- La evidencia del flujo es el historial de Git y los pull requests enlazados.
- El alcance del proyecto termina aquí: no hay un Sprint 3 planificado.
