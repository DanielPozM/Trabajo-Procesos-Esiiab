---
type: Proceso
title: Procesos de trabajo y CI/CD
description: Flujo de ramas y pull requests, integración continua y despliegue continuo.
timestamp: 2026-11-22
---

# Procesos

## Flujo de trabajo

- Modelo GitHub Flow, según la especificación del Sprint 1, apartado 7.1 y el [README](../README.md): rama por cambio, pruebas en local con `npm test`, integración mediante pull request.
- El historial de primera línea de `main` contiene **17 commits de merge de pull request** y **47 commits** en total (`git log --first-parent --merges` y `git rev-list --count origin/main`).
- En primera línea aparecen **25 commits**; de ellos, 6 no tienen commit de merge: `3fa81c8`, `3ef6eef`, `c35b514`, `52ce1be`, `e25fa71` y `838ceb2`. El seguimiento se hizo mediante ramas, pull requests y commits; esos cambios constan en el historial.
- `git tag` devuelve vacío: no hay etiquetas de hitos. El seguimiento del progreso se hizo con los pull requests y sus commits.
- Los pull requests están enlazados en `log.md`, `sprint-1.md` y `sprint-2.md`.
- El proyecto termina en el Sprint 2; no se prevé un Sprint 3.

## Integración continua

Archivo: `.github/workflows/ci.yml`.

- Disparadores: `push` y `pull_request`.
- Job `test` en Ubuntu, con `NODE_ENV: test`.
- Pasos: `actions/checkout@v4`, `actions/setup-node@v4` con Node 20 y caché npm, `npm ci` y `npm test`.
- Ejecución local de referencia: `npm test` → **68 pruebas, 68 aciertos, 0 fallos** (resumen del ejecutor de pruebas de Node).

## Despliegue continuo

- El [README](../README.md) describe el servicio de Cloud Run conectado al repositorio: cada cambio en `main` se despliega en la URL pública.
- `Dockerfile` define la imagen; `scripts/deploy_cloudrun.sh` construye y despliega, guarda secretos en Secret Manager y los inyecta como variables de entorno. Si no se define `SESSION_SECRET`, el script genera uno aleatorio; deduce la URI de retorno OAuth a partir de `APP_BASE_URL`.
- `src/app.js` exige `SESSION_SECRET` y `APP_BASE_URL` en producción y avisa si faltan credenciales de OAuth o SMTP.
- La URL pública y el despliegue están documentados en el README.

## Comprobación de cifras

| Cifra | Comando |
| --- | --- |
| 68 pruebas, 0 fallos | `npm test` (resumen `tests`, `pass`, `fail`) |
| 17 merges de PR | `git log --first-parent --merges --format='%h %s' origin/main` |
| 47 commits totales | `git rev-list --count origin/main` |
| 25 commits en primera línea | `git log --first-parent --format='%h' origin/main` |
| Sin etiquetas | `git tag` |
| Pruebas por archivo | recuento de `test(` en `tests/*.test.js` |

Este bundle se ha creado en la rama `docs/okf-sprint1`, partiendo de `origin/main`, sin commit, push ni pull request.
