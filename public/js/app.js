import { apiClient } from './apiClient.js';


// ========================================
// ELEMENTOS
// ========================================

const welcomeView = document.getElementById('welcome-view');
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const dashboardView = document.getElementById('dashboard-view');

const headerUser = document.getElementById('header-user');
const headerUsername = document.getElementById('header-username');

const usersContainer =
    document.getElementById('users-container');

const alertContainer =
    document.getElementById('alert-container');


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


    if (view === dashboardView) {
        headerUser.style.display = 'flex';
    } else {
        headerUser.style.display = 'none';
    }
}


// ========================================
// ALERTAS
// ========================================

function showAlert(message, type = 'success') {

    const alert = document.createElement('div');

    alert.className = `alert ${type}`;

    alert.textContent = message;

    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 3500);
}


// ========================================
// ESCAPAR HTML
// ========================================

function escapeHtml(value) {

    const div = document.createElement('div');

    div.textContent = value ?? '';

    return div.innerHTML;
}


// ========================================
// BOTONES DE NAVEGACIÓN
// ========================================

document
    .getElementById('go-login')
    .addEventListener('click', () => {

        showView(loginView);
    });


document
    .getElementById('go-register')
    .addEventListener('click', () => {

        showView(registerView);
    });


document
    .getElementById('login-register')
    .addEventListener('click', () => {

        showView(registerView);
    });


document
    .getElementById('register-login')
    .addEventListener('click', () => {

        showView(loginView);
    });


// ========================================
// LOGIN
// ========================================

document
    .getElementById('login-form')
    .addEventListener('submit', async event => {

        event.preventDefault();

        const email =
            document.getElementById('login-email').value.trim();

        const password =
            document.getElementById('login-password').value;


        try {

            const user =
                await apiClient.login(email, password);

            showAlert(
                'Has iniciado sesión correctamente'
            );

            updateHeader(user);

            document
                .getElementById('login-form')
                .reset();

            await showDashboard();

        } catch (error) {

            console.error(error);

            showAlert(
                error.message,
                'error'
            );
        }
    });


// ========================================
// REGISTRO
// ========================================

document
    .getElementById('register-form')
    .addEventListener('submit', async event => {

        event.preventDefault();

        const email =
            document
                .getElementById('register-email')
                .value
                .trim();

        const password =
            document
                .getElementById('register-password')
                .value;


        try {

            const user =
                await apiClient.register(
                    email,
                    password
                );

            showAlert(
                'Cuenta creada correctamente'
            );

            document
                .getElementById('register-form')
                .reset();

            updateHeader(user);

            await showDashboard();

        } catch (error) {

            console.error(error);

            if (error.message === 'EMAIL_EXISTS') {

                showAlert(
                    'Ese email ya está registrado',
                    'error'
                );

            } else {

                showAlert(
                    error.message,
                    'error'
                );
            }
        }
    });


// ========================================
// LOGOUT
// ========================================

async function logout() {

    try {

        await apiClient.logout();

        showAlert(
            'Sesión cerrada correctamente'
        );

        showView(welcomeView);

        headerUsername.textContent = '';

    } catch (error) {

        console.error(error);

        showAlert(
            'No se pudo cerrar la sesión',
            'error'
        );
    }
}


document
    .getElementById('dashboard-logout')
    .addEventListener('click', logout);


document
    .getElementById('header-logout')
    .addEventListener('click', logout);


// ========================================
// ACTUALIZAR CABECERA
// ========================================

function updateHeader(user) {

    if (!user) {
        return;
    }

    headerUsername.textContent =
        user.email || 'Usuario';
}


// ========================================
// DASHBOARD
// ========================================

async function showDashboard() {

    showView(dashboardView);

    try {

        const user =
            await apiClient.me();

        if (!user) {

            showView(welcomeView);

            return;
        }

        updateHeader(user);

        await loadUsers();

    } catch (error) {

        console.error(error);

        showAlert(
            'No se pudo cargar el panel',
            'error'
        );
    }
}


// ========================================
// CARGAR USUARIOS
// ========================================

async function loadUsers() {

    usersContainer.innerHTML = `
        <div class="loading">
            Cargando usuarios...
        </div>
    `;


    try {

        const users =
            await apiClient.getUsers();

        renderUsers(users);

    } catch (error) {

        console.error(error);

        usersContainer.innerHTML = `
            <div class="empty-users">
                <div class="empty-icon">??</div>

                <h3>
                    No se pudieron cargar los usuarios
                </h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>
            </div>
        `;
    }
}


// ========================================
// MOSTRAR USUARIOS
// ========================================

function renderUsers(users) {

    usersContainer.innerHTML = '';


    if (!users || users.length === 0) {

        usersContainer.innerHTML = `
            <div class="empty-users">
                <div class="empty-icon">??</div>

                <h3>
                    No hay usuarios
                </h3>

                <p>
                    Todavía no hay usuarios registrados.
                </p>
            </div>
        `;

        return;
    }


    users.forEach(user => {

        const card =
            document.createElement('div');

        card.className = 'user-card';


        card.innerHTML = `

            <div class="user-avatar">
                ??
            </div>

            <div class="user-info">

                <h3>
                    ${escapeHtml(user.email)}
                </h3>

                <p>
                    ID:
                    ${escapeHtml(String(user.id))}
                </p>

                <span
                    class="user-status"
                    id="status-${escapeHtml(String(user.id))}"
                >
                    Comprobando estado...
                </span>

            </div>

            <div class="user-actions">

                <button
                    class="btn btn-small btn-status"
                    data-id="${escapeHtml(String(user.id))}"
                >
                    Ver estado
                </button>

                <button
                    class="btn btn-small btn-delete"
                    data-id="${escapeHtml(String(user.id))}"
                >
                    Eliminar
                </button>

            </div>
        `;


        usersContainer.appendChild(card);


        // Consultar estado
        checkUserStatus(user.id);


        // Botón estado
        card
            .querySelector('.btn-status')
            .addEventListener(
                'click',
                () => checkUserStatus(user.id)
            );


        // Botón eliminar
        card
            .querySelector('.btn-delete')
            .addEventListener(
                'click',
                () => deleteUser(user.id)
            );
    });
}


// ========================================
// COMPROBAR ESTADO
// ========================================

async function checkUserStatus(id) {

    const statusElement =
        document.getElementById(`status-${id}`);


    if (!statusElement) {
        return;
    }


    try {

        const result =
            await apiClient.getUserActive(id);


        if (result.active) {

            statusElement.textContent =
                '? Activo';

            statusElement.className =
                'user-status active';

        } else {

            statusElement.textContent =
                '? Inactivo';

            statusElement.className =
                'user-status inactive';
        }

    } catch (error) {

        statusElement.textContent =
            'Estado desconocido';

        statusElement.className =
            'user-status unknown';
    }
}


// ========================================
// ELIMINAR USUARIO
// ========================================

async function deleteUser(id) {

    const confirmed =
        confirm(
            '¿Seguro que quieres eliminar este usuario?'
        );


    if (!confirmed) {
        return;
    }


    try {

        await apiClient.deleteUser(id);

        showAlert(
            'Usuario eliminado correctamente'
        );

        await loadUsers();

    } catch (error) {

        console.error(error);

        if (error.message === 'FORBIDDEN') {

            showAlert(
                'No tienes permiso para eliminar este usuario',
                'error'
            );

        } else {

            showAlert(
                error.message,
                'error'
            );
        }
    }
}


// ========================================
// COMPROBAR SESIÓN AL CARGAR
// ========================================

async function checkSession() {

    try {

        const user =
            await apiClient.me();


        if (user) {

            updateHeader(user);

            await showDashboard();

        } else {

            showView(welcomeView);
        }

    } catch (error) {

        console.error(error);

        showView(welcomeView);
    }
}


checkSession();