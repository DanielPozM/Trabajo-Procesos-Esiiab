# Herramientas Utilizadas
- Node.js 18.17.1
- NPM 9.8.1
- Chatgpt 4.0
- Visual Studio Code 1.81.2
- Firestore 10.15.0
Es necesario tener instalado Node.js y NPM para ejecutar la aplicación. Se recomienda utilizar un editor de código como Visual Studio Code para facilitar el desarrollo.
Las pruebas unitarias se ejecutan con npm test. Las variables de entorno estan configuradas dentro de cloud y seran añadidas junto con la entrega en el archivo "Datos Secretos"
Y el puerto es 8080

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

Ejecutar: npm install; npm test; node src/server.js.
Variables: PORT y SESSION_SECRET.


# Sprint 1 - Hito 3
Incluye el Hito 2 y añade persistencia de datos en Firestore, validación de datos, manejo de errores y logging. Subida a la nube y despliegue continuo. Url pública: https://trabajoprocesosdmp-154093406430.europe-west1.run.appnp
Oculta los usuarios al resto de usuarios. El administrador puede ver todos los usuarios y eliminarlos. Los usuarios pueden ver y eliminar sus propios datos.