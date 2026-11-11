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
    MATCH_NOT_FOUND: 'La partida no existe o ya ha terminado.',
    MATCH_VERSION_CONFLICT:
        'La partida ha cambiado. Se ha actualizado la mesa.',
    GAME_FINISHED: 'La partida ya ha terminado.',
    NOT_YOUR_TURN: 'No es tu turno.',
    BID_QUANTITY_INVALID: 'La cantidad de dados no es válida.',
    BID_FACE_INVALID: 'La cara del dado no es válida.',
    BID_TOO_LOW: 'Tu apuesta debe ser mayor que la anterior.',
    CANNOT_CHALLENGE: 'Todavía no hay ninguna apuesta que acusar.',
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
const matchmakingView = document.getElementById('matchmaking-view');
const gameView = document.getElementById('game-view');

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
        dashboardView,
        matchmakingView,
        gameView
    ];

    views.forEach(element => {
        element.classList.remove('active');
    });

    view.classList.add('active');

    const authenticatedViews = [
        dashboardView,
        matchmakingView,
        gameView
    ];

    headerUser.style.display = authenticatedViews.includes(view)
        ? 'flex'
        : 'none';
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
// BOTONES DE EMPAREJAMIENTO
// ========================================

document
    .getElementById('find-opponent')
    .addEventListener('click', startMatchmaking);

document
    .getElementById('matchmaking-cancel')
    .addEventListener('click', cancelMatchmaking);

document.getElementById('game-leave').addEventListener('click', leaveGame);

document
    .getElementById('bid-submit')
    .addEventListener('click', submitBid);

document
    .getElementById('challenge-button')
    .addEventListener('click', callChallenge);

document
    .getElementById('bid-quantity')
    .addEventListener('keydown', event => {
        if (event.key === 'Enter') submitBid();
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
    stopMatchmakingPolling();
    stopGamePolling();

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
    stopMatchmakingPolling();
    stopGamePolling();

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
// EMPAREJAMIENTO
// ========================================

const MATCHMAKING_POLL_MS = 2000;

let matchmakingTimer = null;
let matchmakingActive = false;

function stopMatchmakingPolling() {
    matchmakingActive = false;

    if (matchmakingTimer) {
        clearTimeout(matchmakingTimer);
        matchmakingTimer = null;
    }
}

function setMatchmakingStatus(text) {
    const element = document.getElementById('matchmaking-status');

    if (element) {
        element.textContent = text;
    }
}

function scheduleMatchmakingPoll(delay = MATCHMAKING_POLL_MS) {
    if (!matchmakingActive) return;

    if (matchmakingTimer) {
        clearTimeout(matchmakingTimer);
    }

    matchmakingTimer = setTimeout(() => {
        matchmakingTimer = null;
        pollMatchmaking();
    }, delay);
}

// ========================================
// PARTIDA
// ========================================

const GAME_POLL_MS = 2000;

let gameTimer = null;
let gameActive = false;
let currentMatchId = null;
let currentGameState = null;
let lastBidKey = null;

function stopGamePolling() {
    gameActive = false;

    if (gameTimer) {
        clearTimeout(gameTimer);
        gameTimer = null;
    }
}

function scheduleGamePoll(delay = GAME_POLL_MS) {
    if (!gameActive) return;

    if (gameTimer) {
        clearTimeout(gameTimer);
    }

    gameTimer = setTimeout(() => {
        gameTimer = null;
        pollGame();
    }, delay);
}

function playerName(state, userId) {
    const player = (state?.players || []).find(
        item => String(item.userId) === String(userId)
    );

    return player?.displayName || player?.email || 'Jugador';
}

function diceHtml(values) {
    return values
        .map(value => `<div class="die">${escapeHtml(value)}</div>`)
        .join('');
}

function hiddenDiceHtml(count) {
    return Array.from(
        { length: count },
        () => '<div class="die hidden">?</div>'
    ).join('');
}

function seatHtml(player, { showDice }) {
    const dice = showDice
        ? diceHtml(player.dice || [])
        : hiddenDiceHtml(player.diceCount || 0);

    const count = player.diceCount || 0;

    return `
        <div class="seat-header">

            <div>

                <div class="seat-name">
                    ${escapeHtml(
                        player.displayName || player.email || 'Jugador'
                    )}
                </div>

                <div class="seat-meta">
                    ${count} ${count === 1 ? 'dado' : 'dados'}
                </div>

            </div>

            ${
                player.isTurn
                    ? '<span class="badge badge-status badge-active">Turno</span>'
                    : ''
            }

        </div>

        <div class="seat-dice">
            ${dice || '<span class="seat-meta">Sin dados</span>'}
        </div>
    `;
}

function renderBid(state) {
    const element = document.getElementById('game-current-bid');
    if (!element) return;

    const bid = state.currentBid;

    if (!bid) {
        element.classList.add('empty');
        element.textContent = 'Todavía no hay apuesta.';
        return;
    }

    element.classList.remove('empty');
    element.innerHTML = `
        Apuesta actual:
        <strong>${bid.quantity} × ${bid.face}</strong>
        <span class="seat-meta">
            de ${escapeHtml(playerName(state, bid.playerId))}
        </span>
    `;
}

function renderTurn(state) {
    const element = document.getElementById('game-turn');
    if (!element) return;

    element.classList.toggle('is-yours', Boolean(state.canBid));

    if (state.status === 'finished') {
        element.textContent = 'Partida terminada.';
    } else if (state.canBid) {
        element.textContent = 'Es tu turno.';
    } else {
        element.textContent = `Turno de ${playerName(
            state,
            state.turnPlayerId
        )}.`;
    }
}

function renderResult(state) {
    const element = document.getElementById('game-result');
    if (!element) return;

    if (state.status !== 'finished' || !state.winnerId) {
        element.hidden = true;
        element.className = 'game-result';
        element.innerHTML = '';
        return;
    }

    const winner = (state.players || []).find(
        player => String(player.userId) === String(state.winnerId)
    );
    const youWin = Boolean(winner?.isYou);
    const result = state.lastResult;

    const detail = result
        ? ` La última apuesta era <strong>${result.bid.quantity} × ${
              result.bid.face
          }</strong> y había <strong>${result.matchingCount}</strong> ${
              result.matchingCount === 1 ? 'dado' : 'dados'
          } con esa cara.`
        : '';

    element.hidden = false;
    element.className = `game-result ${youWin ? 'win' : 'lose'}`;
    element.innerHTML = `
        <h2>${youWin ? '¡Has ganado la partida!' : 'Has perdido la partida'}</h2>
        <p>${
            youWin
                ? 'Tu rival se ha quedado sin dados.'
                : 'Te has quedado sin dados.'
        }${detail}</p>
    `;
}

function renderReveal(state) {
    const element = document.getElementById('game-reveal');
    if (!element) return;

    const result = state.lastResult;

    if (!result || !result.hands) {
        element.hidden = true;
        element.innerHTML = '';
        return;
    }

    const bidder = escapeHtml(playerName(state, result.bidderId));
    const challenger = escapeHtml(
        playerName(state, result.challengerId)
    );
    const loser = escapeHtml(playerName(state, result.loserId));

    const hands = Object.entries(result.hands)
        .map(
            ([userId, dice]) => `
                <div class="reveal-hand">
                    <span class="seat-meta">
                        ${escapeHtml(playerName(state, userId))}
                    </span>
                    <div class="seat-dice">
                        ${diceHtml(dice)}
                    </div>
                </div>
            `
        )
        .join('');

    element.hidden = false;
    element.innerHTML = `
        <h2>Ronda ${result.round}: dados revelados</h2>
        <p>
            ${bidder} apostó
            <strong>${result.bid.quantity} × ${result.bid.face}</strong>
            y ${challenger} acusó de mentira. Había
            <strong>${result.matchingCount}</strong>
            ${result.matchingCount === 1 ? 'dado' : 'dados'} con esa
            cara: la apuesta era
            <strong>${result.bidIsTrue ? 'verdadera' : 'falsa'}</strong>.
            <span class="log-loss">${loser} pierde un dado.</span>
        </p>

        <div class="reveal-hands">
            ${hands}
        </div>
    `;
}

function renderLog(state) {
    const element = document.getElementById('game-log');
    if (!element) return;

    const items = (state.history || []).map(entry => {
        const name = escapeHtml(playerName(state, entry.playerId));
        const date = entry.at ? new Date(entry.at) : null;
        const time =
            date && !Number.isNaN(date.getTime())
                ? date.toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                  })
                : '';

        if (entry.type === 'bid') {
            return `
                <li>
                    <strong>Ronda ${entry.round}</strong> ·
                    ${name} apuesta
                    <strong>${entry.quantity} × ${entry.face}</strong>.
                    <span class="seat-meta">${time}</span>
                </li>
            `;
        }

        if (entry.type === 'challenge') {
            const loser = escapeHtml(playerName(state, entry.loserId));
            const detail = entry.bidIsTrue
                ? `La apuesta era verdadera: había ${entry.matchingCount} dados con cara ${entry.face}.`
                : `La apuesta era falsa: solo había ${entry.matchingCount} dados con cara ${entry.face}.`;

            return `
                <li>
                    <strong>Ronda ${entry.round}</strong> ·
                    ${name} acusa mentira
                    (${entry.quantity} × ${entry.face}).
                    ${detail}
                    <span class="log-loss">${loser} pierde un dado.</span>
                    <span class="seat-meta">${time}</span>
                </li>
            `;
        }

        if (entry.type === 'gameOver') {
            const winner = escapeHtml(
                playerName(state, entry.winnerId)
            );

            return `
                <li>
                    <strong>Fin</strong> ·
                    <span class="log-win">${winner} gana la partida.</span>
                </li>
            `;
        }

        return '';
    });

    element.innerHTML =
        items.join('') || '<li>Todavía no hay jugadas.</li>';
}

function updateControls(state) {
    const bidSubmit = document.getElementById('bid-submit');
    const challengeButton = document.getElementById('challenge-button');
    const quantityInput = document.getElementById('bid-quantity');
    const faceSelect = document.getElementById('bid-face');
    const hint = document.getElementById('game-hint');

    const canBid = Boolean(state?.canBid);
    const canChallenge = Boolean(state?.canChallenge);

    if (bidSubmit) bidSubmit.disabled = !canBid;
    if (challengeButton) challengeButton.disabled = !canChallenge;
    if (quantityInput) {
        quantityInput.disabled = !canBid;
        quantityInput.max = String(state?.totalDice || 1);
    }
    if (faceSelect) faceSelect.disabled = !canBid;

    if (!hint) return;

    if (state?.status === 'finished') {
        hint.textContent =
            'La partida ha terminado. Vuelve al panel para buscar otra.';
        return;
    }

    if (!canBid) {
        hint.textContent = 'Esperando la jugada de tu rival...';
        return;
    }

    if (state.currentBid) {
        hint.textContent =
            `Tu apuesta debe superar ${state.currentBid.quantity} × ${state.currentBid.face}. ` +
            'Sube la cantidad o, con la misma cantidad, la cara. ' +
            'Si crees que miente, pulsa "¡Mentira!".';
        return;
    }

    hint.textContent =
        'Abre la ronda con una apuesta. Después podrás subirla o acusar de mentira.';
}

function syncBidInputs(state) {
    if (!state?.canBid) return;

    const bid = state.currentBid;
    const key = `${state.round}:${state.turnPlayerId}:${
        bid ? `${bid.quantity}x${bid.face}` : 'none'
    }`;

    if (key === lastBidKey) return;

    lastBidKey = key;

    const minimum = state.minimumBid || { quantity: 1, face: 1 };
    const quantityInput = document.getElementById('bid-quantity');
    const faceSelect = document.getElementById('bid-face');

    if (quantityInput) {
        quantityInput.value = String(minimum.quantity);
    }

    if (faceSelect) {
        faceSelect.value = String(minimum.face);
    }
}

function renderGame(state) {
    currentGameState = state;

    const self =
        (state.players || []).find(player => player.isYou) || {};
    const opponent =
        (state.players || []).find(player => !player.isYou) || {};

    const selfSeat = document.getElementById('game-self');
    const opponentSeat = document.getElementById('game-opponent');

    if (selfSeat) {
        selfSeat.innerHTML = seatHtml(self, { showDice: true });
        selfSeat.classList.toggle('is-turn', Boolean(self.isTurn));
    }

    if (opponentSeat) {
        opponentSeat.innerHTML = seatHtml(opponent, {
            showDice: false
        });
        opponentSeat.classList.toggle(
            'is-turn',
            Boolean(opponent.isTurn)
        );
    }

    const kicker = document.getElementById('game-kicker');
    if (kicker) kicker.textContent = `Ronda ${state.round}`;

    renderBid(state);
    renderTurn(state);
    renderResult(state);
    renderReveal(state);
    renderLog(state);
    updateControls(state);
    syncBidInputs(state);

    if (state.status === 'finished') {
        stopGamePolling();
    }
}

async function showGame(match) {
    stopMatchmakingPolling();
    stopGamePolling();

    currentMatchId = match?.id || null;
    currentGameState = null;
    lastBidKey = null;
    gameActive = true;

    showView(gameView);

    const kicker = document.getElementById('game-kicker');
    if (kicker) kicker.textContent = 'Cargando mesa...';

    const turn = document.getElementById('game-turn');
    if (turn) turn.textContent = 'Preparando los dados...';

    if (!currentMatchId) {
        stopGamePolling();

        if (currentUser) {
            await showDashboard(currentUser);
        }

        showAlert('No se pudo abrir la partida.', 'error');
        return;
    }

    try {
        const state = await apiClient.getGame(currentMatchId);

        if (!gameActive || !currentMatchId) return;

        renderGame(state);
        scheduleGamePoll();
    } catch (error) {
        console.error(error);
        stopGamePolling();

        if (currentUser) {
            await showDashboard(currentUser);
        }

        showAlert(messageFor(error), 'error');
    }
}

async function pollGame() {
    if (!gameActive || !currentMatchId) return;

    try {
        const state = await apiClient.getGame(currentMatchId);

        if (!gameActive || !currentMatchId) return;

        renderGame(state);

        if (state.status !== 'finished') {
            scheduleGamePoll();
        }
    } catch (error) {
        console.error(error);

        if (!gameActive) return;

        if (error.code === 'UNAUTHENTICATED') {
            stopGamePolling();
            currentUser = null;
            headerUsername.textContent = '';
            showView(welcomeView);
            showAlert(messageFor(error), 'error');
            return;
        }

        if (
            error.code === 'MATCH_NOT_FOUND' ||
            error.code === 'FORBIDDEN'
        ) {
            stopGamePolling();
            currentMatchId = null;

            if (currentUser) {
                await showDashboard(currentUser);
            }

            showAlert(messageFor(error), 'error');
            return;
        }

        scheduleGamePoll(3000);
    }
}

async function handleGameActionError(error) {
    console.error(error);

    const syncCodes = [
        'NOT_YOUR_TURN',
        'BID_TOO_LOW',
        'MATCH_VERSION_CONFLICT',
        'GAME_FINISHED'
    ];

    if (syncCodes.includes(error.code) && currentMatchId) {
        try {
            const state = await apiClient.getGame(currentMatchId);
            renderGame(state);
            return;
        } catch (refreshError) {
            console.error(refreshError);
        }
    }

    showAlert(messageFor(error), 'error');
}

async function submitBid() {
    if (!currentMatchId || !currentGameState?.canBid) return;

    const quantityInput = document.getElementById('bid-quantity');
    const faceSelect = document.getElementById('bid-face');
    const button = document.getElementById('bid-submit');

    const quantity = Number(quantityInput?.value);
    const face = Number(faceSelect?.value);

    if (!Number.isInteger(quantity) || quantity < 1) {
        showAlert('Indica una cantidad válida.', 'error');
        return;
    }

    setBusy(button, true, 'Apostando...');

    try {
        const state = await apiClient.placeBid(
            currentMatchId,
            quantity,
            face
        );

        renderGame(state);
    } catch (error) {
        await handleGameActionError(error);
    } finally {
        setBusy(button, false);
        updateControls(currentGameState);
    }
}

async function callChallenge() {
    if (!currentMatchId || !currentGameState?.canChallenge) return;

    const button = document.getElementById('challenge-button');
    setBusy(button, true, 'Acusando...');

    try {
        const state = await apiClient.challenge(currentMatchId);

        renderGame(state);
    } catch (error) {
        await handleGameActionError(error);
    } finally {
        setBusy(button, false);
        updateControls(currentGameState);
    }
}

function leaveGame() {
    stopGamePolling();

    currentMatchId = null;
    currentGameState = null;
    lastBidKey = null;

    if (currentUser) {
        showDashboard(currentUser);
    }
}

function handleMatchmakingResult(result) {
    if (!matchmakingActive) return;

    if (result.status === 'matched' && result.match) {
        showGame(result.match);
        return;
    }

    if (result.status === 'waiting') {
        setMatchmakingStatus(
            'Esperando a otro jugador. La búsqueda continúa...'
        );
        scheduleMatchmakingPoll();
        return;
    }

    setMatchmakingStatus('Reintentando búsqueda...');
    scheduleMatchmakingPoll(500);
}

async function startMatchmaking() {
    if (!currentUser) return;

    stopMatchmakingPolling();
    matchmakingActive = true;

    showView(matchmakingView);
    setMatchmakingStatus('Conectando con la cola de emparejamiento...');

    try {
        const result = await apiClient.joinMatchmaking();

        if (!matchmakingActive) return;

        handleMatchmakingResult(result);
    } catch (error) {
        console.error(error);

        if (!matchmakingActive) return;

        stopMatchmakingPolling();

        if (currentUser) {
            await showDashboard(currentUser);
        }

        showAlert(messageFor(error), 'error');
    }
}

async function pollMatchmaking() {
    if (!matchmakingActive) return;

    try {
        const result = await apiClient.getMatchmakingStatus();

        if (!matchmakingActive) return;

        if (result.status === 'idle') {
            const joined = await apiClient.joinMatchmaking();

            if (!matchmakingActive) return;

            handleMatchmakingResult(joined);
            return;
        }

        handleMatchmakingResult(result);
    } catch (error) {
        console.error(error);

        if (!matchmakingActive) return;

        if (error.code === 'UNAUTHENTICATED') {
            stopMatchmakingPolling();
            currentUser = null;
            headerUsername.textContent = '';
            showView(welcomeView);
            showAlert(messageFor(error), 'error');
            return;
        }

        setMatchmakingStatus(
            'No se pudo comprobar la cola. Reintentando...'
        );
        scheduleMatchmakingPoll(3000);
    }
}

async function cancelMatchmaking() {
    stopMatchmakingPolling();

    try {
        await apiClient.leaveMatchmaking();
    } catch (error) {
        console.error(error);
    }

    if (currentUser) {
        await showDashboard(currentUser);
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
