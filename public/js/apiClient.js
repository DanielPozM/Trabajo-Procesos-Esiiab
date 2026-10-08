export const apiClient = {

    // =========================
    // AUTENTICACIÓN
    // =========================

    async register(email, password) {

        const response = await fetch('/api/auth/register', {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            credentials: 'include',

            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'Error al registrarse'
            );
        }

        return data;
    },


    async login(email, password) {

        const response = await fetch('/api/auth/login', {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            credentials: 'include',

            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'Email o contraseña incorrectos'
            );
        }

        return data;
    },


    async logout() {

        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok && response.status !== 204) {
            throw new Error('No se pudo cerrar la sesión');
        }

        return true;
    },


    async me() {

        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        return response.json();
    },


    // =========================
    // USUARIOS
    // =========================

    async getUsers() {

        const response = await fetch('/api/users', {
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'No se pudieron obtener los usuarios'
            );
        }

        return data;
    },


    async getUserActive(id) {

        const response = await fetch(
            `/api/users/${id}/active`,
            {
                credentials: 'include'
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || 'No se pudo consultar el usuario'
            );
        }

        return data;
    },


    async deleteUser(id) {

        const response = await fetch(
            `/api/users/${id}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );

        if (!response.ok) {

            const data = await response.json();

            throw new Error(
                data.error || 'No se pudo eliminar el usuario'
            );
        }

        return true;
    }

};