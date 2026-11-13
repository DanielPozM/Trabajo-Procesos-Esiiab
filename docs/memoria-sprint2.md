# Memoria del Sprint 2

**Proyecto:** Gestión de Usuarios y Dado Mentiroso
**Repositorio:** <https://github.com/DanielPozM/Trabajo-Procesos-Esiiab>
**Aplicación desplegada:** <https://trabajoprocesosdmp-154093406430.europe-west1.run.app>
**Periodo:** Sprint 2
**Estado:** cerrado — Hitos 1–4 y corrección de abandono fusionados en `main` (PRs #12–#16)

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Punto de partida y objetivos](#2-punto-de-partida-y-objetivos)
3. [Organización del trabajo](#3-organización-del-trabajo)
4. [Arquitectura y decisiones transversales](#4-arquitectura-y-decisiones-transversales)
5. [Hito 1 — Emparejamiento](#5-hito-1--emparejamiento)
6. [Hito 2 — Motor del dado mentiroso](#6-hito-2--motor-del-dado-mentiroso)
7. [Hito 3 — Estética pirata y menú](#7-hito-3--estética-pirata-y-menú)
8. [Hito 4 — Recompensas y color de los dados](#8-hito-4--recompensas-y-color-de-los-dados)
9. [Corrección de errores — Abandono de partida](#9-corrección-de-errores--abandono-de-partida)
10. [Seguridad](#10-seguridad)
11. [Pruebas y calidad](#11-pruebas-y-calidad)
12. [Integración y despliegue continuo](#12-integración-y-despliegue-continuo)
13. [Incidencias y lecciones aprendidas](#13-incidencias-y-lecciones-aprendidas)
14. [Métricas del sprint](#14-métricas-del-sprint)
15. [Conclusiones y líneas futuras](#15-conclusiones-y-líneas-futuras)
16. [Anexo A — API del sprint](#anexo-a--api-del-sprint)
17. [Anexo B — Variables de entorno nuevas](#anexo-b--variables-de-entorno-nuevas)
18. [Anexo C — Comandos de trabajo](#anexo-c--comandos-de-trabajo)

---

## 1. Resumen ejecutivo

El Sprint 2 convierte la aplicación de gestión de usuarios del Sprint 1 en un
juego multijugador completo. Al final del sprint un usuario puede:

1. elegir el color de sus dados entre los que tenga desbloqueados;
2. buscar oponente en una cola de emparejamiento;
3. jugar una partida de **dado mentiroso** (apuestas, acusaciones y pérdida de
   dados) con estado siempre calculado en el servidor;
4. ganar colores al vencer, que quedan guardados en su perfil;
5. abandonar una partida a medias y dejar que el rival gane, sin quedarse
   bloqueado al volver a buscar pareja.

El sprint se dividió en cuatro hitos, cada uno en su propia rama, commit y
pull request, más una corrección de errores posterior. Se añadieron tres capas
nuevas (emparejamiento, juego y recompensas) manteniendo la arquitectura por
capas del Sprint 1: **API → servicio → repositorio**, con un motor de juego puro
e independiente de Express y de la base de datos.

Resultado medible:

| Indicador | Valor |
| --- | --- |
| Hitos completados | 4 de 4 |
| Pull requests fusionadas | 5 (#12, #13, #14, #15, #16) |
| Correcciones posteriores | 1 (abandono de partida, PR #16) |
| Pruebas automatizadas | **68**, todas en verde |
| Ficheros tocados en el sprint | 26 |
| Líneas añadidas / eliminadas | +5 278 / −173 |
| Cobertura funcional | registro, sesión, emparejamiento, juego, recompensas y abandono |

---

## 2. Punto de partida y objetivos

### 2.1. Estado al inicio del sprint

El Sprint 1 había entregado:

- registro local con confirmación por correo y tokens hasheados;
- inicio de sesión con contraseña y con Google OAuth 2.0;
- sesiones persistentes en Firestore;
- roles `user` / `admin` y autorización en servidor;
- panel de administración con listado, estado y borrado de usuarios;
- despliegue en Cloud Run con CI en GitHub Actions.

La base del Sprint 1 ya incluía la separación estricta por capas y dos
implementaciones de repositorio (memoria/fichero y Firestore), lo que permitió
reutilizar el patrón sin refactorizaciones grandes.

### 2.2. Objetivos del Sprint 2

| Hito | Objetivo | Criterio de aceptación |
| --- | --- | --- |
| 1 | Cola de emparejamiento | Dos jugadores que buscan a la vez quedan emparejados en una partida, sin carreras ni emparejamientos dobles |
| 2 | Juego del dado mentiroso | Partida completa con turnos, apuestas, acusaciones, pérdida de dados y fin de partida |
| 3 | Interfaz definitiva | Estética pirata, menú principal y mesa de juego usable en escritorio y móvil |
| 4 | Recompensas | Sorteo de colores al ganar, desbloqueo persistente y selección previa a la partida |
| Extra | Corrección de abandono | Volver al panel cierra la partida y da la victoria al rival; volver a buscar no reabre la partida |

### 2.3. Requisitos no funcionales

- La lógica de negocio no puede depender de Express ni de Firestore.
- El navegador **nunca** debe recibir los dados del rival antes de una acusación.
- Las operaciones sensibles deben ser idempotentes o transaccionales.
- Los secretos no se versionan; `.env.example` solo contiene nombres.
- Cada hito debe poder revisarse de forma aislada en un pull request.

---

## 3. Organización del trabajo

### 3.1. Flujo de ramas

Se siguió **GitHub Flow**: una rama por hito, PR contra `main`, revisión y
fusión. Los hitos se encadenaron sobre `main` ya actualizado, y la rama del
Hito 4 se rebasó directamente sobre la fusión del Hito 3 para que el diff
contuviera únicamente su funcionalidad.

```
main
 ├─ sprint2-hito1-matchmaking ──► PR #12 ──► merge 5026603
 ├─ sprint2-hito2-game        ──► PR #13 ──► merge 3c2b741
 ├─ sprint2-hito3-visuales    ──► PR #14 ──► merge 620d0a6
 ├─ sprint2-hito4-recompensas ──► PR #15 ──► merge 8572da7
 └─ fix/abandono-partida      ──► PR #16 ──► merge 7aaf86f
```

### 3.2. Commits principales

| Commit | Tipo | Contenido |
| --- | --- | --- |
| `cde878f` | feat | Cola de emparejamiento, API y pantalla de búsqueda |
| `6989bca` | feat | Motor del dado mentiroso, servicio de partida y mesa |
| `7169b68` | style | Estética pirata y renombrado del menú |
| `2687bfa` | feat | Recompensas de color y personalización del dado |
| `cc52eef` | fix | Abandono de partida con victoria del rival |

### 3.3. Reparto por hitos

| Hito | Ficheros | Líneas |
| --- | --- | --- |
| 1 — Emparejamiento | 13 | +1 297 / −12 |
| 2 — Juego | 14 | +2 154 / −89 |
| 3 — Estética | 3 | +851 / −93 |
| 4 — Recompensas | 21 | +1 360 / −53 |
| Corrección | 10 | +254 / −15 |

---

## 4. Arquitectura y decisiones transversales

### 4.1. Capas

```
Navegador
  ├─ presentación: public/index.html + public/js/app.js
  └─ cliente API:  public/js/apiClient.js
          │ HTTP/JSON (mismo origen, cookie de sesión)
          ▼
API HTTP: src/api/authRoutes.js, userRoutes.js,
          matchmakingRoutes.js, gameRoutes.js
          │
          ▼
Servicios: userService.js
           matchmakingService.js
           gameService.js
           liarsDice.js  ← motor puro, sin E/S
           emailService.js
          │
          ▼
Repositorios: userRepository(.Firestore).js
              matchmakingRepository(.Firestore).js
              sessionStoreFirestore.js
```

Reglas que se mantuvieron durante todo el sprint:

- **La API solo traduce HTTP**: valida sesión y cuerpo, llama al servicio y
  convierte errores de negocio en códigos HTTP mediante `src/api/httpErrors.js`.
- **Los servicios no conocen Express**: reciben objetos de usuario y devuelven
  vistas públicas.
- **El motor del juego es puro**: `liarsDice.js` recibe estado y devuelve estado
  nuevo; no escribe en base de datos ni lee variables de entorno. Esto permite
  probarlo con un reloj y un generador aleatorio inyectados.
- **Los repositorios son intercambiables**: memoria/fichero para desarrollo y
  pruebas, Firestore para producción. La composición se hace en `src/app.js`.

### 4.2. Inyección de dependencias

Todos los servicios reciben sus colaboradores por constructor:

```js
new MatchmakingService(repository, { now });
new GameService(repository, { now, randomInt, rewardRandomInt, userService });
new UserService(repository, { emailService, now, randomInt });
```

Esto permite fijar el reloj (`now`) y el azar (`randomInt`) en las pruebas, de
modo que los tests son deterministas y no dependen de la hora real ni de
`Math.random`.

### 4.3. Versionado optimista

Las partidas guardan un campo `version`. Cada escritura envía
`expectedVersion`; si otro jugador escribió antes, el repositorio lanza
`MATCH_VERSION_CONFLICT` y el servicio reintenta hasta tres veces. Con ello se
evita que dos jugadores pisen la misma jugada y que una mesa abierta a la vez
por ambos genere dos repartos de dados distintos.

### 4.4. Errores de negocio

Los servicios lanzan errores con un código (`GAME_FINISHED`, `NOT_YOUR_TURN`,
`MATCH_VERSION_CONFLICT`, `DICE_COLOR_LOCKED`…). `httpErrors.js` los mapea a
HTTP y el frontend los traduce a mensajes en español. Las respuestas nunca
incluyen trazas internas.

### 4.5. Modelo de datos

**Usuario** (colección `procesosusuariosdpm`):

```json
{
  "id": "u_123",
  "email": "jugador@example.com",
  "passwordHash": "…",
  "active": true,
  "role": "user",
  "diceColors": ["gray", "green", "blue"],
  "selectedDiceColor": "green",
  "diceRewards": {
    "match_1": { "colorId": "green", "isNew": true, "at": "2026-11-12T18:00:00.000Z" }
  }
}
```

**Cola de emparejamiento** (documento único `matchmaking/queue`):

```json
{
  "entries": [
    {
      "userId": "u_123",
      "email": "jugador@example.com",
      "displayName": "jugador",
      "diceColor": "green",
      "joinedAt": 1762960000000,
      "lastSeenAt": 1762960010000
    }
  ],
  "updatedAt": 1762960010000
}
```

**Partida** (colección `matches`):

```json
{
  "id": "match_1",
  "status": "active",
  "version": 3,
  "playerIds": ["u_123", "u_456"],
  "players": [
    { "userId": "u_123", "email": "…", "displayName": "…", "diceColor": "green" },
    { "userId": "u_456", "email": "…", "displayName": "…", "diceColor": "gray" }
  ],
  "createdAt": "2026-11-12T18:00:00.000Z",
  "game": { "status": "playing", "round": 1, "turnPlayerId": "u_456", "dice": {}, "currentBid": null, "history": [] },
  "reward": null
}
```

`status` de la partida pasa de `active` a `finished`; el estado real del juego
vive dentro de `game` (`playing` / `finished`). El color elegido se **congela**
en `players[].diceColor` al emparejar, de modo que un cambio de color posterior
no altera una partida ya creada.

---

## 5. Hito 1 — Emparejamiento

**Rama:** `sprint2-hito1-matchmaking` · **PR:** #12 · **Commit:** `cde878f`

### 5.1. Objetivo

Permitir que un jugador entre en una cola, espere si no hay nadie y quede
emparejado automáticamente cuando llegue otro. La pantalla debía reflejar el
estado sin recargar.

### 5.2. Decisiones de diseño

- **Un único documento de cola** (`matchmaking/queue`) con un array de
  entradas. Se eligió frente a una colección de entradas porque el
  emparejamiento debe ser atómico: leer la cola, elegir rival y crear la
  partida tienen que ocurrir en la misma transacción.
- **Transacción de Firestore** en `enqueueOrMatch`, `getStatus` y `leave`. Dos
  jugadores que pulsan «buscar» al mismo tiempo no pueden emparejarse dos veces
  ni quedarse ambos esperando.
- **TTL de 2 minutos** (`MATCHMAKING_TTL_SECONDS`). Las entradas caducadas se
  podan al leer; así una pestaña cerrada no bloquea la cola.
- **Heartbeat implícito**: cada consulta de estado actualiza `lastSeenAt`, pero
  como mucho una vez cada 10 segundos (`LAST_SEEN_UPDATE_MS`) para no escribir
  en Firestore en cada *poll*.
- **Anti-autoemparejamiento**: el candidato se filtra por `userId` distinto y
  se ordena por `joinedAt`, de forma que empareja el que lleva más tiempo
  esperando.
- **Vista pública**: `publicMatch()` elimina campos internos (`version`,
  `game`, datos sensibles) y deja solo `id`, `status`, `createdAt` y los
  jugadores con su color.

### 5.3. Implementación

| Fichero | Responsabilidad |
| --- | --- |
| `src/repositories/matchmakingRepository.js` | Cola en memoria para desarrollo y tests; operaciones síncronas |
| `src/repositories/matchmakingRepositoryFirestore.js` | Cola y partidas en Firestore con transacciones |
| `src/services/matchmakingService.js` | Reglas: entrada del jugador, `join`, `status`, `leave`, `getMatch` |
| `src/api/matchmakingRoutes.js` | Endpoints y autorización |
| `public/js/app.js` | Pantalla de búsqueda con *polling* cada 2 s |

Endpoints añadidos:

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/matchmaking/join` | Entra en la cola o devuelve la partida asignada |
| `GET` | `/api/matchmaking/status` | Consulta si espera o ya tiene partida |
| `POST` | `/api/matchmaking/leave` | Sale de la cola |
| `GET` | `/api/matchmaking/matches/:id` | Consulta una partida concreta |

### 5.4. Interfaz

Se añadió la vista `matchmaking-view` con:

- estado textual («Buscando oponente…»);
- animación de espera;
- botón de cancelar;
- *polling* cada 2 000 ms que se detiene al salir de la vista o al encontrar
  partida;
- transición automática a la mesa cuando el estado pasa a `matched`.

### 5.5. Pruebas

`tests/matchmaking.test.js` (9 pruebas): espera sin oponente, emparejamiento,
misma partida para ambos, reentrada de un jugador ya emparejado, no
autoemparejamiento, salida de la cola, caducidad, acceso restringido y ausencia
de datos internos.

---

## 6. Hito 2 — Motor del dado mentiroso

**Rama:** `sprint2-hito2-game` · **PR:** #13 · **Commit:** `6989bca`

### 6.1. Reglas implementadas

- Cada jugador empieza con **4 dados de 6 caras** y solo ve los suyos.
- El primer turno es aleatorio; en las rondas siguientes empieza el ganador de
  la ronda anterior.
- En cada turno se puede **subir la apuesta** (cantidad y cara) o **acusar**.
- Una apuesta es válida si sube la cantidad, o mantiene la cantidad y sube la
  cara. La cantidad no puede superar el total de dados en juego.
- Al acusar se revelan ambas manos:
  - si hay **menos** dados de la cara apostada que la cantidad, pierde un dado
    quien apostó;
  - en caso contrario, pierde un dado quien acusó.
- La partida termina cuando un jugador se queda sin dados.

### 6.2. Motor puro (`src/services/liarsDice.js`)

Funciones exportadas:

| Función | Uso |
| --- | --- |
| `createGame({ playerIds, randomInt, now })` | Reparte dados y elige turno inicial |
| `applyBid(game, playerId, bid, { now })` | Valida y registra una apuesta |
| `applyChallenge(game, playerId, { now, randomInt })` | Resuelve la acusación |
| `applyForfeit(game, playerId, { now })` | Cierra la partida por abandono |
| `nextMinimumBid(game)` | Sugiere la apuesta mínima válida |
| `totalDiceCount(game)` | Dados en juego |
| `toPublicGame(game, viewerId)` | Vista segura para un jugador |

Detalles relevantes:

- **Inmutabilidad**: cada operación clona el estado y devuelve uno nuevo. El
  estado anterior no se muta, lo que simplifica el versionado y las pruebas.
- **Historial acotado**: `MAX_HISTORY = 40` entradas para que el documento no
  crezca sin límite.
- **Privacidad**: `toPublicGame` oculta los dados del rival salvo en la ronda
  revelada por una acusación, y calcula `canBid` / `canChallenge` para que el
  frontend no tenga que replicar reglas.
- **Azar inyectable**: `randomInt(min, max)` permite que las pruebas usen
  siempre el mínimo y obtengan resultados deterministas.

### 6.3. Servicio de partida (`src/services/gameService.js`)

Responsabilidades:

- cargar la partida y comprobar que el usuario es jugador (`FORBIDDEN` si no);
- crear el juego la primera vez que se abre la mesa (`_ensureGame`);
- aplicar la acción y persistir con `expectedVersion`;
- conceder la recompensa si la partida ha terminado;
- devolver una vista privada con nombres, colores y recompensa.

La apertura simultánea de la mesa se resolvió con el control de versión: si
ambos jugadores intentan crear el juego a la vez, uno gana y el otro recibe
`MATCH_VERSION_CONFLICT`; el servicio recarga la partida, ve que ya tiene
`game` y la devuelve sin volver a repartir.

### 6.4. API

| Método | Ruta | Acceso |
| --- | --- | --- |
| `GET` | `/api/matches/:id` | Jugadores de la partida |
| `POST` | `/api/matches/:id/bids` | Jugador con el turno |
| `POST` | `/api/matches/:id/challenge` | Jugador con el turno |

Errores nuevos: `MATCH_NOT_FOUND` (404), `MATCH_VERSION_CONFLICT` (409),
`GAME_FINISHED` (409), `NOT_YOUR_TURN` (409), `BID_QUANTITY_INVALID` (400),
`BID_FACE_INVALID` (400), `BID_TOO_LOW` (409), `CANNOT_CHALLENGE` (400).

### 6.5. Interfaz

La vista `game-view` incluye:

- dados propios representados como cuadrados 2D;
- marcador de dados restantes por jugador;
- apuesta actual y turno;
- selector de cantidad y cara, con validación en cliente y servidor;
- botón de acusar;
- historial de la partida;
- mensaje de resultado al terminar.

### 6.6. Pruebas

- `tests/liarsDice.test.js` (17 pruebas): reparto, validación de jugadores,
  turnos, apuestas válidas e inválidas, acusación verdadera y falsa, revelación
  de manos, fin de partida, abandono y vista pública.
- `tests/gameService.test.js` (12 pruebas): creación perezosa, privacidad,
  permisos, persistencia, apertura simultánea, acciones inválidas, recompensa y
  abandono.

---

## 7. Hito 3 — Estética pirata y menú

**Rama:** `sprint2-hito3-visuales` · **PR:** #14 · **Commits:** `7169b68`, `a276877`

### 7.1. Objetivo

Dar identidad visual al juego y reorganizar la navegación tras añadir partidas.

### 7.2. Cambios

- Tema pirata en `public/index.html`: paleta de maderas, dorados y tonos
  oscuros; tipografía serif para títulos y textos de ambientación.
- Nuevo menú principal con tres acciones: **JUGADORES**, **BUSCAR OPONENTE** y
  **PERSONALIZAR DADO**.
- Mesa de juego rediseñada: fieltro, marco, asientos de jugador y zona de
  apuesta.
- Textos y nombres de la aplicación adaptados al juego («Lier's Dice»).
- Estilos responsivos para que la mesa sea usable en pantallas pequeñas.
- Se fusionó `main` dentro de la rama (`a276877`) para resolver los cambios
  del Hito 2 antes de abrir el PR.

### 7.3. Alcance técnico

El hito fue deliberadamente **solo de presentación**: no se tocó la API ni los
servicios. Los únicos ficheros modificados fueron `public/index.html`,
`package-lock.json` y `.env.example`.

---

## 8. Hito 4 — Recompensas y color de los dados

**Rama:** `sprint2-hito4-recompensas` · **PR:** #15 · **Commit:** `2687bfa`

### 8.1. Objetivo

Al ganar una partida, sortear un color de dado. Los colores desbloqueados se
guardan en el perfil y pueden seleccionarse antes de cada partida; el color
elegido se muestra en los dados de ese jugador.

### 8.2. Catálogo y probabilidades

`src/lib/diceColors.js` centraliza el catálogo:

| Color | `id` | Peso | Probabilidad |
| --- | --- | --- | --- |
| Gris (base) | `gray` | 0 | siempre disponible |
| Verde | `green` | 50 | 50 % |
| Azul | `blue` | 20 | 20 % |
| Morado | `purple` | 10 | 10 % |
| Amarillo | `yellow` | 5 | 5 % |
| Rojo | `red` | 4 | 4 % |
| Rosa | `pink` | 1 | 1 % |
| Sin premio | — | 10 | 10 % |

Los pesos de los colores suman 90; el 10 restante es el resultado «sin
premio». `rollDiceColor(randomInt)` recorre los tramos acumulados y devuelve
`null` cuando cae en el tramo final. El gris nunca se sortea.

### 8.3. Persistencia e idempotencia

Campos nuevos del perfil:

- `diceColors`: colores desbloqueados (siempre incluye `gray`);
- `selectedDiceColor`: color activo, validado contra los desbloqueados;
- `diceRewards`: mapa `matchId → { colorId, isNew, at }`.

La concesión se hace con `claimDiceReward(userId, matchId, colorId)`:

1. si ya existe una entrada para esa partida, devuelve la anterior sin volver a
   sortear ni desbloquear;
2. si no, normaliza los colores, añade el nuevo si procede y guarda la entrada;
3. recorta el historial a las últimas **100** recompensas.

En Firestore la operación se ejecuta dentro de una transacción, por lo que dos
peticiones simultáneas (por ejemplo, dos pestañas consultando la partida
terminada) no pueden duplicar el premio. En memoria se resuelve con una
comprobación y escritura síncronas.

Además, el premio se guarda en la propia partida (`match.reward`) mediante
`saveReward`, de modo que ambos jugadores ven el mismo resultado y una recarga
no cambia el color concedido.

### 8.4. Color congelado en la partida

`MatchmakingService._entryFor(user)` lee `selectedDiceColor(user)` y lo guarda
en la entrada de la cola. Al crear la partida, ese color se copia a
`players[].diceColor`. Consecuencias:

- ambos jugadores ven el color del rival en la mesa;
- cambiar de color después de emparejarse no altera la partida en curso;
- el frontend no necesita consultar el perfil para pintar los dados.

### 8.5. API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/users/me/dice-colors` | Catálogo con estado de desbloqueo y selección |
| `PATCH` | `/api/users/me/dice-color` | Selecciona `{ colorId }` si está desbloqueado |

Errores nuevos: `DICE_COLOR_INVALID` (400) y `DICE_COLOR_LOCKED` (403).

### 8.6. Interfaz

- Vista `customize-view` («PERSONALIZAR DADO») con una tarjeta por color:
  muestra el nombre, el porcentaje, si está desbloqueado y cuál está activo.
- Los colores bloqueados aparecen atenuados y no se pueden seleccionar.
- Los dados de la mesa usan variables CSS (`--dice-color`) para pintar el
  cuadrado del color del jugador.
- Al terminar la partida se muestra un aviso con el color obtenido y si era
  nuevo.

### 8.7. Pruebas

- `tests/diceColors.test.js` (6): reparto 90/10, tramos, normalización, gris
  por defecto, estado del catálogo y recorte del historial.
- `tests/gameService.test.js`: ganador con premio, tirada sin premio y premio
  idempotente.
- `tests/userService.test.js`: perfil inicial, selección válida, color
  bloqueado y premio único por partida.

---

## 9. Corrección de errores — Abandono de partida

**Rama:** `fix/abandono-partida` · **PR:** #16 · **Commit:** `cc52eef` · **Merge:** `7aaf86f`

### 9.1. Síntoma reportado

> «Si un jugador vuelve al menú cuando está con una partida a medias con otro
> jugador, se le concede la victoria al que no abandona y la partida finaliza.
> Ahora mismo lo que sucede es que al buscar rival de nuevo te devuelve a la
> partida como estaba antes, bloqueándote si el rival ha desaparecido.»

### 9.2. Análisis de la causa

El botón «Volver al panel» solo limpiaba el estado del navegador:

```js
function leaveGame() {
    stopGamePolling();
    currentMatchId = null;
    currentGameState = null;
    ...
}
```

No avisaba al servidor. La partida seguía `active` y `_findActiveMatch(userId)`
la devolvía en la siguiente búsqueda. Si el rival había cerrado la pestaña, el
jugador quedaba atrapado en una mesa sin oponente y sin forma de salir.

Había dos fallos independientes:

1. **No existía una operación de abandono**: el servidor no tenía forma de
   cerrar la partida.
2. **El emparejamiento no distinguía partidas terminadas**: `_findActiveMatch`
   solo miraba `status === 'active'`, así que una partida finalizada podía
   reabrirse.

### 9.3. Solución

**a) Motor (`applyForfeit`)**

```js
export function applyForfeit(game, playerId, { now = () => Date.now() } = {}) {
    if (!game || game.status !== 'playing') return game;

    const player = String(playerId);
    const winnerId = otherPlayerId(game, player);
    if (!winnerId) throw new Error('GAME_REQUIRES_TWO_PLAYERS');

    const at = nowIso(now);
    const next = cloneGame(game);

    next.status = 'finished';
    next.turnPlayerId = null;
    next.currentBid = null;
    next.winnerId = winnerId;
    next.forfeitedBy = player;
    next.updatedAt = at;
    next.history = pushHistory(next.history, {
        type: 'forfeit',
        round: game.round,
        playerId: player,
        winnerId,
        at
    });

    return next;
}
```

Es **idempotente**: si la partida ya no está `playing`, devuelve el mismo
objeto. Así un doble clic o un reintento no cambia al ganador.

**b) Servicio y API**

- `GameService.abandon(user, matchId)` reutiliza `_mutate`, con lo que hereda
  permisos, versionado y concesión de recompensa.
- `POST /api/matches/:id/abandon` expone la operación.
- `_mutate` detecta que el estado no ha cambiado (`nextGame === current.game`)
  y no vuelve a escribir ni a subir la versión.

**c) Recompensa**

El abandono cuenta como victoria normal: el rival recibe su tirada de color y
la recompensa queda guardada en la partida. Al ser idempotente por
`matchId`, consultar después no duplica el desbloqueo.

**d) Emparejamiento**

Ambos repositorios ignoran ahora las partidas cuyo juego ha terminado:

```js
match.status === 'active' && match.game?.status !== 'finished'
```

Con ello, volver a buscar crea una partida nueva en lugar de reabrir la vieja.

**e) Frontend**

- `abandonCurrentGame()` llama a `POST /abandon` y limpia el estado local.
- `leaveGame()` y `logout()` son `async` y **esperan** la petición antes de
  navegar; así el cierre se registra aunque el usuario cambie de pantalla.
- La mesa muestra «Tu rival ha abandonado la partida» o «Has abandonado la
  partida» según corresponda.
- El historial incluye una entrada `forfeit` con el ganador.

### 9.4. Carreras y casos límite

| Caso | Comportamiento |
| --- | --- |
| Doble clic en «Volver al panel» | La segunda llamada devuelve el mismo estado; no hay doble premio |
| Ambos jugadores abandonan a la vez | El primero que confirma la escritura decide el ganador; el segundo ve el resultado ya fijado |
| Abandono antes de abrir la mesa | `_ensureGame` crea el juego y `applyForfeit` lo cierra; el rival gana |
| Acción después del abandono | `applyBid`/`applyChallenge` lanzan `GAME_FINISHED` (409) |
| Recompensa tras recargar | Se lee de `match.reward`; no se vuelve a sortear |

### 9.5. Verificación

- `tests/liarsDice.test.js`: abandono, idempotencia y vista pública.
- `tests/gameService.test.js`: abandono en curso, abandono antes de abrir,
  recompensa al rival, `GAME_FINISHED` y reencolado.
- **Smoke test HTTP real** con servidor y base de datos en fichero:
  - `alice` y `bob` se emparejan (`match_1`);
  - `alice` abandona → `winnerId: bob`, `forfeitedBy: alice`;
  - `bob` recibe `reward.colorId: green`;
  - una apuesta tardía devuelve `409 GAME_FINISHED`;
  - al reencolar se crea `match_2`.

---

## 10. Seguridad

Medidas incorporadas o reforzadas durante el sprint:

- **Autorización en servidor** en todos los endpoints de juego: pertenencia a la
  partida, turno y estado.
- **Privacidad de los dados**: el rival nunca recibe los dados ajenos hasta la
  acusación; la vista se construye en el servidor.
- **Control optimista de versión** para evitar jugadas pisadas.
- **Idempotencia** en recompensas y abandono.
- **Validación de colores**: el servidor comprueba que el color está
  desbloqueado; no basta con ocultar la tarjeta en el cliente.
- **Secretos fuera del repositorio**: en el Hito 4 se vaciaron las credenciales
  de administrador que aún figuraban en `.env.example`.
- **Limpieza de artefactos**: se eliminó `tmp-ui-server.mjs`, un servidor
  auxiliar de pruebas que se había colado en el Hito 2.
- **Errores sin trazas**: las respuestas solo contienen `{ "error": "CODIGO" }`.
- **Límite de tamaño del cuerpo JSON** y manejo de `INVALID_JSON` /
  `PAYLOAD_TOO_LARGE`.
- **Sesión**: cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción y
  regeneración al autenticar.

---

## 11. Pruebas y calidad

### 11.1. Ejecución

```bash
npm test
```

Node ejecuta `node --test` sobre `tests/*.test.js`. No hay dependencias de
test externas ni necesidad de base de datos: los repositorios de memoria y los
generadores inyectados hacen las pruebas rápidas y deterministas.

### 11.2. Distribución

| Fichero | Pruebas | Ámbito |
| --- | --- | --- |
| `tests/auth.test.js` | 3 | Hash de contraseña, cuenta pendiente, credenciales |
| `tests/userService.test.js` | 21 | Registro, confirmación, OAuth, roles, colores y premios |
| `tests/matchmaking.test.js` | 9 | Cola, emparejamiento, TTL, permisos |
| `tests/liarsDice.test.js` | 17 | Reglas del juego y abandono |
| `tests/gameService.test.js` | 12 | Persistencia, versionado, recompensas, abandono |
| `tests/diceColors.test.js` | 6 | Catálogo, sorteo, normalización |
| **Total** | **68** | |

Resultado de la última ejecución:

```
ℹ tests 68
ℹ pass 68
ℹ fail 0
ℹ duration_ms ~2 s
```

### 11.3. Estrategia

- **Motor puro**: se prueba sin dobles de base de datos.
- **Servicios con repositorio en memoria**: se prueba la orquestación real.
- **Reloj y azar inyectados**: los casos límite (caducidad, turno inicial,
  premio sin color) son reproducibles.
- **Pruebas de regresión**: cada error corregido deja al menos una prueba que
  lo cubre (por ejemplo, reencolado tras abandono).
- **Smoke test manual** para flujos que cruzan HTTP, sesión y persistencia.

---

## 12. Integración y despliegue continuo

- **CI:** `.github/workflows/ci.yml` ejecuta `npm ci` y `npm test` en cada push
  y pull request.
- **CD:** Cloud Run despliega `main`. Como alternativa reproducible,
  `scripts/deploy_cloudrun.sh` construye la imagen, publica los secretos en
  Secret Manager y despliega sin credenciales en el código.
- **Secretos gestionados:** `session-secret`, `init-admin-password`,
  `google-client-secret` y `smtp-pass`.
- **Infraestructura:** proyecto `trabajo-procesos-dpm`, región
  `europe-west1`, servicio `trabajoprocesosdmp`, cuenta de servicio
  `run-firestore-sa@trabajo-procesos-dpm.iam.gserviceaccount.com`.
- **Firestore:** base `procesosusuariosdpm`; colecciones `sessions`,
  `matchmaking` y `matches`.

---

## 13. Incidencias y lecciones aprendidas

| Incidencia | Causa | Resolución |
| --- | --- | --- |
| Partida reabierta al volver a buscar | `_findActiveMatch` no filtraba partidas terminadas | Filtro por `game.status !== 'finished'` en ambos repositorios |
| Jugador bloqueado sin rival | No existía operación de abandono en servidor | `applyForfeit` + endpoint `/abandon` + llamada desde el frontend |
| Doble apertura de mesa | Dos jugadores creaban el juego a la vez | `expectedVersion` y reintento con recarga |
| Premio duplicado al recargar | Varias consultas de una partida terminada | `claimDiceReward` idempotente por `matchId` + `match.reward` |
| Credenciales en `.env.example` | Valor de ejemplo copiado de un entorno real | Variables vaciadas y secretos movidos a Secret Manager |
| Fichero temporal versionado | `tmp-ui-server.mjs` se añadió por error | Eliminado en el Hito 4 |
| Confusión de colecciones en local | `.env` apuntaba a Firestore | Pruebas locales con `DB_TYPE=file` y `FIRESTORE_COLLECTION=''` |
| Rama del Hito 4 con commits ajenos | Rama creada antes de fusionar el Hito 3 | Rebase sobre `main` y *force-push* con *lease* |

**Lecciones:**

1. Toda acción del usuario que cambia el estado del juego debe pasar por el
   servidor; limpiar el estado del navegador no es abandonar.
2. Las consultas de «partida activa» deben filtrar por el estado del juego, no
   solo por el estado del documento.
3. Las operaciones que conceden algo deben ser idempotentes desde el primer
   diseño, no después.
4. Los repositorios en memoria permiten probar reglas complejas sin depender de
   la nube, pero hay que mantener las dos implementaciones en paralelo.

---

## 14. Métricas del sprint

### 14.1. Cambios acumulados (`Sprint 1` → `main` del Sprint 2)

```
26 ficheros cambiados, 5 278 inserciones(+), 173 eliminaciones(-)
```

### 14.2. Tamaño de los módulos principales

| Fichero | Líneas |
| --- | --- |
| `public/index.html` | 2 496 |
| `public/js/app.js` | 1 676 |
| `src/services/liarsDice.js` | 369 |
| `src/repositories/matchmakingRepositoryFirestore.js` | 278 |
| `src/services/gameService.js` | 262 |
| `src/repositories/matchmakingRepository.js` | 177 |
| `src/lib/diceColors.js` | 156 |
| `src/services/matchmakingService.js` | 108 |

### 14.3. Cobertura funcional por hito

| Área | Hito 1 | Hito 2 | Hito 3 | Hito 4 | Fix |
| --- | --- | --- | --- | --- | --- |
| API | ✔ | ✔ | — | ✔ | ✔ |
| Servicios | ✔ | ✔ | — | ✔ | ✔ |
| Repositorios | ✔ | ✔ | — | ✔ | ✔ |
| Frontend | ✔ | ✔ | ✔ | ✔ | ✔ |
| Pruebas | ✔ | ✔ | — | ✔ | ✔ |

---

## 15. Conclusiones y líneas futuras

El Sprint 2 cumple los cuatro hitos y añade una corrección importante surgida
del uso real. La arquitectura por capas permitió añadir emparejamiento, juego y
recompensas sin reescribir el Sprint 1, y el motor puro facilitó probar reglas
complejas con rapidez.

Puntos fuertes:

- separación estricta de responsabilidades;
- estado del juego siempre en servidor;
- operaciones transaccionales e idempotentes;
- 68 pruebas deterministas y rápidas;
- despliegue continuo con secretos gestionados.

Líneas futuras:

- **Revancha inmediata** desde la pantalla de resultado.
- **Historial de partidas** por jugador (victorias, derrotas, colores).
- **Reconexión**: recuperar una partida en curso tras recargar el navegador.
- **Temporadas o ranking** con los colores como recompensa.
- **Notificaciones** cuando el rival abandona o cuando llega el turno.
- **Accesibilidad**: revisar contraste y navegación por teclado en la mesa.
- **Pruebas de integración HTTP** automatizadas en CI, no solo *smoke* manual.

---

## Anexo A — API del sprint

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/matchmaking/join` | Autenticado | Entra en la cola o devuelve la partida |
| `GET` | `/api/matchmaking/status` | Autenticado | Estado de espera o partida |
| `POST` | `/api/matchmaking/leave` | Autenticado | Sale de la cola |
| `GET` | `/api/matchmaking/matches/:id` | Jugadores | Consulta una partida |
| `GET` | `/api/matches/:id` | Jugadores | Estado privado del juego |
| `POST` | `/api/matches/:id/bids` | Turno | Apuesta `{ quantity, face }` |
| `POST` | `/api/matches/:id/challenge` | Turno | Acusa de mentira |
| `POST` | `/api/matches/:id/abandon` | Jugadores | Abandona; gana el rival |
| `GET` | `/api/users/me/dice-colors` | Autenticado | Catálogo y selección de color |
| `PATCH` | `/api/users/me/dice-color` | Autenticado | Selecciona `{ colorId }` |

## Anexo B — Variables de entorno nuevas

| Variable | Uso |
| --- | --- |
| `MATCHMAKING_TTL_SECONDS` | Validez de una entrada en la cola |
| `MATCHMAKING_COLLECTION` | Colección de la cola (por defecto `matchmaking`) |
| `MATCHES_COLLECTION` | Colección de partidas (por defecto `matches`) |

## Anexo C — Comandos de trabajo

```bash
# Instalar y arrancar
npm install
npm start            # http://localhost:3000
npm run dev          # recarga automática

# Pruebas
npm test

# Pruebas locales con fichero en vez de Firestore
DB_TYPE=file DB_FILE=tmp/dev.json FIRESTORE_COLLECTION='' npm start

# Comprobar sintaxis de un módulo
node --check src/services/liarsDice.js
```

---

*Documento generado a partir del estado real de `main` y de las ramas del
Sprint 2. Última actualización: noviembre de 2026.*
