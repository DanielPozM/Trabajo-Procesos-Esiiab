---
type: Sprint
title: Sprint 1
description: Hitos del Sprint 1, seguimiento por pull request y retrospectiva.
timestamp: 2026-11-22
---

# Sprint 1

Los objetivos de los hitos se toman del apartado 10 de la especificación del Sprint 1. El seguimiento se hizo mediante pull requests y commits.

## Hito 1 — Esqueleto y backend

- **Objetivo:** repositorio con ramas y pull requests; CI y CD desde el primer día; capa lógica de usuarios en memoria con pruebas; API que exponga esa lógica.
- **Qué se hizo:** PR #1 (`a58ed1c`, 2026-10-08). Aporta `.github/workflows/ci.yml`, `src/services/userService.js`, `src/repositories/userRepository.js`, `src/api/userRoutes.js`, `src/app.js` y `tests/userService.test.js`.
- **PR:** [#1](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/1).
- **Seguimiento:** PR y commits; no se usaron etiquetas de hito.

## Hito 2 — Frontend y sesión

- **Objetivo:** interfaz y cliente de comunicación separados; registro e inicio de sesión locales con hash; cierre y mantenimiento de sesión entre recargas; rutas protegidas; datos aún en memoria.
- **Qué se hizo:** PR #2 (`1fe13f6`, 2026-10-08). Amplía `public/index.html`, `public/js/app.js` y `public/js/apiClient.js`, añade sesión y rutas protegidas, y amplía `tests/userService.test.js` y `tests/auth.test.js`.
- **PR:** [#2](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/2).
- **Seguimiento:** PR y commits; no se usaron etiquetas de hito.

## Hito 3 — Persistencia y roles

- **Objetivo:** base de datos real sin cambiar la lógica; secretos por entorno; roles usuario/administrador con restricciones en servidor; registro de actividad.
- **Qué se hizo:** PR #3 (`7a7e70f`), #4 (`ea3ac37`), #5 (`eaa9548`), #6 (`915aaeb`), #7 (`8d21b08`), #8 (`e2c383d`), #9 (`073f375`) y #10 (`5c1a5a5`), entre el 8 y el 12 de octubre. Aportan `UserRepositoryFirestore`, `FirestoreSessionStore`, `Dockerfile`, `scripts/deploy_cloudrun.sh`, `scripts/reset_admin.js`, `src/lib/logger.js`, comprobaciones de rol y documentación.
- **PRs:** [#3](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/3), [#4](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/4), [#5](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/5), [#6](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/6), [#7](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/7), [#8](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/8), [#9](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/9), [#10](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/10).
- **Registro de cambios:** en primera línea aparecen `3fa81c8`, `838ceb2`, `3ef6eef`, `c35b514`, `52ce1be` y `e25fa71` sin commit de merge; los dos últimos revierten los dos anteriores. Esos cambios constan en el historial y el seguimiento se hizo con los PRs listados.
- **Seguimiento:** PR y commits; no se usaron etiquetas de hito.

## Hito 4 — Servicios externos y cierre

- **Objetivo:** OAuth con proveedor externo; confirmación de cuenta por correo; errores con feedback claro; README completo y revisión final.
- **Qué se hizo:** PR #11 (`adbd6ad`, 2026-11-11). Aporta flujo OAuth con Google, `src/services/emailService.js`, verificación de correo, `src/api/httpErrors.js`, `src/lib/logger.js`, endurecimiento de `src/app.js` y documentación.
- **PR:** [#11](https://github.com/DanielPozM/Trabajo-Procesos-Esiiab/pull/11).
- **Seguimiento:** PR y commits; no se usaron etiquetas de hito.

## Retrospectiva

### Hechos

- 11 pull requests integrados en el Sprint 1: #1 a #11 (commits de merge `a58ed1c`, `1fe13f6`, `7a7e70f`, `ea3ac37`, `eaa9548`, `915aaeb`, `8d21b08`, `e2c383d`, `073f375`, `5c1a5a5` y `adbd6ad`).
- 6 commits en primera línea sin commit de merge durante el Hito 3; cuatro forman dos pares de cambio y revert.
- No se usaron etiquetas de hito: `git tag` está vacío.
- Las pruebas actuales del repositorio son 68, con 0 fallos (`npm test`); el primer `tests/userService.test.js` aparece en el PR #1.

### Qué funcionó

- La separación por capas permitió pasar de datos en memoria a Firestore sin reescribir la lógica de negocio; el mismo patrón sirvió después en el Sprint 2.
- Las pruebas unitarias y el CI dieron una red sobre la lógica en cada cambio.
- Los pull requests por hito dejan visible la evolución del proyecto.

### Qué cambiaría

- Habría etiquetado cada hito al terminarlo para tener el progreso marcado en el historial.
- Habría dejado más claro en el historial cómo se integraron los seis commits sin commit de merge.
- Habría configurado antes los servicios externos (correo y OAuth), como aconseja la especificación en el Hito 4, en lugar de dejarlos para el final.

Los requisitos funcionales del Sprint 2 y su estado están en [sprint-2.md](sprint-2.md); la memoria detallada está en [memoria-sprint2.md](memoria-sprint2.md).
