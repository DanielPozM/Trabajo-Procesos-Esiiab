# Herramientas Utilizadas
- Node.js 18.17.1
- NPM 9.8.1
- Chatgpt 4.0
- Visual Studio Code 1.81.2

# Sprint 1 — Hito 1

Arquitectura:  presentación,  cliente API,  API HTTP,  negocio y  acceso a datos. El frontend nunca accede directamente al repositorio. El backend sirve el frontend desde el mismo origen.

Arquitectura: public -> apiClient -> API -> servicios -> repositorio.

Ejecutar: npm install; npm test; npm start.
Variables: PORT y SESSION_SECRET.

## CI/CD
CI ejecuta pruebas en push y pull request. El despliegue continuo se configura conectando el repositorio a un proveedor cloud.

# Sprint 1 - Hito 2

Incluye el Hito 1 y añade registro/login local, hash seguro de contraseñas, logout, sesion persistente mediante cookie y rutas protegidas. Los datos siguen en memoria. OAuth y confirmacion por correo corresponden al Hito 4.

Arquitectura: public -> apiClient -> API -> servicios -> repositorio.

Ejecutar: npm install; npm test; npm start.
Variables: PORT y SESSION_SECRET.

# Sprint 1 - Hito 3

Cambios realizados para añadir administrador y usuario normal. El administrador es dpm@gmail.com y su contraseña es 123456789. Se diferencian en que solo el administrador pude ver los usuarios activos.
