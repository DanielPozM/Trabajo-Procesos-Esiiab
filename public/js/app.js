import { apiClient } from './apiClient.js';

// ========================================
// MENSAJES DE ERROR
// ========================================

const ERROR_MESSAGES = {
    EMAIL_INVALID: 'El email no tiene un formato válido.',
    PASSWORD_TOO_SHORT:
        'La contraseña debe tener al menos 8 caracteres.',
    PASSWORD_TOO_LONG: 'La contraseña es demasiado larga.',
    EMAIL_EXISTS: 'Ese email ya está registrado.',
    INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
    ACCOUNT_PENDING:
        'Debes confirmar tu cuenta desde el correo que te hemos enviado antes de iniciar sesión.',
    OAUTH_ONLY:
        'Esta cuenta se creó con Google. Usa el botón "Continuar con Google".',
    FORBIDDEN: 'No tienes permiso para realizar esta acción.',
    UNAUTHENTICATED: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
    USER_NOT_FOUND: 'El usuario no existe o ya ha sido eliminado.',
    VERIFICATION_TOKEN_INVALID:
        'El enlace de confirmación no es válido.',
    VERIFICATION_TOKEN_EXPIRED:
        'El enlace de confirmación ha caducado. Solicita uno nuevo.',
    EMAIL_NOT_CONFIGURED:
        'El envío de correos no está configurado en el servidor.',
    EMAIL_SEND_FAILED:
        'No se pudo enviar el correo de confirmación. Inténtalo de nuevo.',
    RATE_LIMITED:
        'Espera un minuto antes de solicitar otro correo de confirmación.',
    OAUTH_NOT_CONFIGURED:
        'El inicio de sesión con Google no está configurado en el servidor.',
    OAUTH_STATE_INVALID:
        'La sesión de Google ha caducado. Inténtalo de nuevo.',
    OAUTH_CANCELLED: 'Has cancelado el inicio de sesión con Google.',
    OAUTH_EMAIL_NOT_VERIFIED: 'Google no ha verificado tu email.',
    OAUTH_EMAIL_MISSING: 'Google no ha devuelto un email válido.',
    OAUTH_EXCHANGE_FAILED:
        'No se pudo completar el inicio de sesión con Google.',
    INVALID_JSON: 'La petición no es válida.',
    PAYLOAD_TOO_LARGE: 'La petición es demasiado grande.',
    NOT_FOUND: 'Recurso no encontrado.',
    INTERNAL_ERROR: 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'
};

function messageFor(error) {
    const code = error?.code || error?.message;
    return ERROR_MESSAGES[code] || code || ERROR_MESSAGES.INTERNAL_ERROR;
}

// ========================================
// ELEMENTOS
// ========================================

const welcomeView = document.getElementById('welcome-view');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const dashboardView = document.getElementById('dashboard-view');

const headerUser = document.getElementById('header-user');
const headerUsername = document.getElementById('header-username');

const usersContainer = document.getElementById('users-container');
const alertContainer = document.getElementById('alert-container');

const usersTitle = document.getElementById('users-title');
const dashboardSubtitle = document.getElementById('dashboard-subtitle');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');

let currentUser = null;

// ========================================
// NAVEGACIÓN
// ========================================

function showView(view) {
    const views = [
        welcomeView,
        loginView,
        registerView,
        dashboardView
    ];

    views.forEach(element => {
        element.classList.remove('active');
    });

    view.classList.add('active');

    headerUser.style.display =
        view === dashboardView ? 'flex' : 'none';
}

// ========================================
// ALERTAS
// ========================================

function showAlert(message, type = 'success', duration = 4500) {
    const alert = document.createElement('div');

    alert.className = `alert ${type}`;
    alert.textContent = message;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, duration);
}

// ========================================
// UTILIDADES
// ========================================

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
}

function roleLabel(role) {
    return role === 'admin' ? 'Administrador' : 'Usuario';
}

function providerLabel(provider) {
    return provider === 'google' ? 'Google' : provider;
}

function setBusy(button, busy, busyText) {
    if (!button) return;

    if (busy) {
        button.dataset.originalText = button.textContent;
        button.disabled = true;
        button.textContent = busyText;
    } else {
        button.disabled = false;
        button.textContent =
            button.dataset.originalText || button.textContent;
    }
}

function updateHeader(user) {
    if (!user) return;

    headerUsername.textContent =
        `${user.email} · ${roleLabel(user.role)}`;
}

function userBadges(user, viewer) {
    const role =
        user.role === 'admin'
            ? '<span class="badge badge-admin">Administrador</span>'
            : '<span class="badge badge-user">Usuario</span>';

    const status = user.active
        ? '<span class="badge badge-status badge-active">Activo</span>'
        : '<span class="badge badge-status badge-pending">Pendiente</span>';

    const provider = user.oauthProvider
        ? `<span class="badge badge-oauth">${escapeHtml(
              providerLabel(user.oauthProvider)
          )}</span>`
        : '';

    const self =
        String(user.id) === String(viewer.id)
            ? '<span class="badge badge-self">Tu cuenta</span>'
            : '';

    return `<div class="user-meta">${role}${status}${provider}${self}</div>`;
}

// ========================================
// BOTONES DE NAVEGACIÓN
// ========================================

document.getElementById('go-login').addEventListener('click', () => {
    showView(loginView);
});

document.getElementById('go-register').addEventListener('click', () => {
    showView(registerView);
});

document.getElementById('login-register').addEventListener('click', () => {
    showView(registerView);
});

document.getElementById('register-login').addEventListener('click', () => {
    showView(loginView);
});

// ========================================
// LOGIN
// ========================================

loginForm.addEventListener('submit', async event => {
    event.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    const submitButton = loginForm.querySelector(
        'button[type="submit"]'
    );

    setBusy(submitButton, true, 'Entrando...');

    try {
        const user = await apiClient.login(email, password);

        showAlert('Has iniciado sesión correctamente');
        loginForm.reset();
        await showDashboard(user);
    } catch (error) {
        console.error(error);

        if (error.code === 'ACCOUNT_PENDING') {
            showAlert(messageFor(error), 'error', 8000);
            document
                .getElementById('login-resend')
                .classList.add('highlight');
        } else {
            showAlert(messageFor(error), 'error');
        }
    } finally {
        setBusy(submitButton, false);
    }
});

// ========================================
// REGISTRO
// ========================================

registerForm.addEventListener('submit', async event => {
    event.preventDefault();

    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const submitButton = registerForm.querySelector(
        'button[type="submit"]'
    );

    if (password.length < 8) {
        showAlert(
            'La contraseña debe tener al menos 8 caracteres.',
            'error'
        );
        return;
    }

    setBusy(submitButton, true, 'Creando cuenta...');

    try {
        const user = await apiClient.register(email, password);

        showAlert(
            `Cuenta creada. Hemos enviado un correo de confirmación a ${user.email}. ` +
                'Revisa también la carpeta de spam.',
            'success',
            8000
        );

        registerForm.reset();
        loginEmail.value = user.email;
        showView(loginView);
        loginPassword.focus();
    } catch (error) {
        console.error(error);
        showAlert(messageFor(error), 'error');
    } finally {
        setBusy(submitButton, false);
    }
});

// ========================================
// REENVIAR CONFIRMACIÓN
// ========================================

document
    .getElementById('login-resend')
    .addEventListener('click', async event => {
        const button = event.currentTarget;
        const email = loginEmail.value.trim();

        if (!email) {
            showAlert(
                'Introduce tu email para reenviar la confirmación.',
                'error'
            );
            loginEmail.focus();
            return;
        }

        setBusy(button, true, 'Enviando...');

        try {
            await apiClient.resendVerification(email);

            showAlert(
                'Si la cuenta existe y está pendiente, hemos enviado un nuevo correo. ' +
                    'Revisa tu bandeja y la carpeta de spam.',
                'success',
                8000
            );

            button.classList.remove('highlight');
        } catch (error) {
            console.error(error);
            showAlert(messageFor(error), 'error');
        } finally {
            setBusy(button, false);
        }
    });

// ========================================
// LOGOUT
// ========================================

async function logout() {
    try {
        await apiClient.logout();

        currentUser = null;
        headerUsername.textContent = '';
        showView(welcomeView);
        showAlert('Sesión cerrada correctamente');
    } catch (error) {
        console.error(error);
        showAlert('No se pudo cerrar la sesión', 'error');
    }
}

document
    .getElementById('dashboard-logout')
    .addEventListener('click', logout);

document
    .getElementById('header-logout')
    .addEventListener('click', logout);

// ========================================
// DASHBOARD
// ========================================

async function showDashboard(user) {
    currentUser = user;

    showView(dashboardView);
    updateHeader(user);

    if (user.role === 'admin') {
        if (usersTitle) usersTitle.textContent = 'Usuarios registrados';
        if (dashboardSubtitle) {
            dashboardSubtitle.textContent =
                'Listado completo de usuarios. Puedes consultar su estado y eliminarlos.';
        }

        await loadUsers(user);
    } else {
        if (usersTitle) usersTitle.textContent = 'Tu cuenta';
        if (dashboardSubtitle) {
            dashboardSubtitle.textContent =
                'Estos son los datos de tu cuenta. Puedes eliminar tu propio usuario.';
        }

        renderUsers([user], user);
    }
}

async function loadUsers(viewer) {
    usersContainer.innerHTML = `
        <div class="loading">
            Cargando usuarios...
        </div>
    `;

    try {
        const users = await apiClient.getUsers();
        renderUsers(users, viewer);
    } catch (error) {
        console.error(error);

        if (error.code === 'UNAUTHENTICATED') {
            currentUser = null;
            headerUsername.textContent = '';
            showView(welcomeView);
            showAlert(messageFor(error), 'error');
            return;
        }

        usersContainer.innerHTML = `
            <div class="empty-users">
                <div class="empty-icon">⚠️</div>
                <h3>No se pudieron cargar los usuarios</h3>
                <p>${escapeHtml(messageFor(error))}</p>
            </div>
        `;
    }
}

function renderUsers(users, viewer) {
    usersContainer.innerHTML = '';

    if (!users || users.length === 0) {
        usersContainer.innerHTML = `
            <div class="empty-users">
                <div class="empty-icon">👥</div>
                <h3>No hay usuarios</h3>
                <p>Todavía no hay usuarios registrados.</p>
            </div>
        `;

        return;
    }

    users.forEach(user => {
        const card = document.createElement('div');
        const isSelf = String(user.id) === String(viewer.id);
        const canDelete = viewer.role === 'admin' || isSelf;

        card.className = 'user-card';

        card.innerHTML = `
            <div class="user-avatar">
                ${escapeHtml(
                    String(user.email || '?')
                        .charAt(0)
                        .toUpperCase()
                )}
            </div>

            <div class="user-info">
                <h3>${escapeHtml(user.email)}</h3>
                <p>ID: ${escapeHtml(String(user.id))}</p>
                ${userBadges(user, viewer)}
                <span class="user-status ${
                    user.active ? 'active' : 'inactive'
                }">
                    ${user.active ? 'Activo' : 'Pendiente'}
                </span>
            </div>

            <div class="user-actions">
                ${
                    viewer.role === 'admin'
                        ? `<button class="btn btn-small btn-status" type="button">
                               Ver estado
                           </button>`
                        : ''
                }
                ${
                    canDelete
                        ? `<button class="btn btn-small btn-delete" type="button">
                               ${isSelf ? 'Eliminar mi cuenta' : 'Eliminar'}
                           </button>`
                        : ''
                }
            </div>
        `;

        usersContainer.appendChild(card);

        const statusElement = card.querySelector('.user-status');
        const statusBadge = card.querySelector('.badge-status');
        const statusButton = card.querySelector('.btn-status');
        const deleteButton = card.querySelector('.btn-delete');

        if (statusButton) {
            statusButton.addEventListener('click', () =>
                checkUserStatus(user.id, statusElement, statusBadge)
            );
        }

        if (deleteButton) {
            deleteButton.addEventListener('click', () =>
                deleteUser(user, viewer)
            );
        }
    });
}

// ========================================
// COMPROBAR ESTADO
// ========================================

async function checkUserStatus(id, statusElement, statusBadge) {
    if (!statusElement) return;

    statusElement.textContent = 'Comprobando...';
    statusElement.className = 'user-status unknown';

    try {
        const result = await apiClient.getUserActive(id);

        statusElement.textContent = result.active
            ? 'Activo'
            : 'Pendiente';
        statusElement.className = `user-status ${
            result.active ? 'active' : 'inactive'
        }`;

        if (statusBadge) {
            statusBadge.textContent = result.active
                ? 'Activo'
                : 'Pendiente';
            statusBadge.className = `badge badge-status ${
                result.active ? 'badge-active' : 'badge-pending'
            }`;
        }
    } catch (error) {
        console.error(error);
        statusElement.textContent = 'Estado desconocido';
        statusElement.className = 'user-status unknown';
    }
}

// ========================================
// ELIMINAR USUARIO
// ========================================

async function deleteUser(user, viewer) {
    const confirmed = confirm(
        `¿Seguro que quieres eliminar la cuenta ${user.email}? ` +
            'Esta acción no se puede deshacer.'
    );

    if (!confirmed) return;

    try {
        await apiClient.deleteUser(user.id);

        showAlert('Usuario eliminado correctamente');

        if (String(user.id) === String(viewer.id)) {
            currentUser = null;
            headerUsername.textContent = '';
            showView(welcomeView);
        } else {
            await loadUsers(viewer);
        }
    } catch (error) {
        console.error(error);

        if (error.code === 'UNAUTHENTICATED') {
            currentUser = null;
            headerUsername.textContent = '';
            showView(welcomeView);
        }

        showAlert(messageFor(error), 'error');
    }
}

// ========================================
// MENSAJES DE LA URL
// ========================================

function handleUrlMessages(params) {
    let handled = false;

    if (params.has('verified')) {
        const verified = params.get('verified') === '1';

        if (verified) {
            showAlert(
                'Cuenta confirmada correctamente. Ya puedes iniciar sesión.',
                'success',
                8000
            );

            const email = params.get('email');

            if (email) loginEmail.value = email;

            showView(loginView);
        } else {
            showAlert(
                messageFor({
                    code:
                        params.get('error') ||
                        'VERIFICATION_TOKEN_INVALID'
                }),
                'error',
                8000
            );

            showView(loginView);
        }

        handled = true;
    }

    if (params.get('oauth') === 'success') {
        showAlert('Has iniciado sesión con Google.', 'success');
        handled = true;
    }

    if (params.get('oauth') === 'error') {
        showAlert(
            messageFor({
                code: params.get('reason') || 'OAUTH_EXCHANGE_FAILED'
            }),
            'error',
            8000
        );

        showView(loginView);
        handled = true;
    }

    if (handled) {
        window.history.replaceState({}, '', '/');
    }

    return handled;
}

// ========================================
// COMPROBAR SESIÓN AL CARGAR
// ========================================

async function checkSession() {
    try {
        const user = await apiClient.me();

        if (user) {
            await showDashboard(user);
        } else {
            showView(welcomeView);
        }
    } catch (error) {
        console.error(error);
        showView(welcomeView);
    }
}

async function init() {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth') === 'success';
    const handled = handleUrlMessages(params);

    if (oauthSuccess) {
        await checkSession();
        return;
    }

    if (!handled) {
        await checkSession();
    }
}

init();
