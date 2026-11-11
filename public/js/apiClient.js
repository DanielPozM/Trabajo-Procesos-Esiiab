export class ApiError extends Error {
    constructor(code, status) {
        super(code);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }
}

async function request(path, options = {}) {
    const response = await fetch(path, {
        credentials: 'include',
        ...options
    });

    const text = await response.text();
    let data = null;

    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            data = null;
        }
    }

    if (!response.ok) {
        throw new ApiError(
            data?.error || 'INTERNAL_ERROR',
            response.status
        );
    }

    return data;
}

function jsonOptions(method, body) {
    return {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}

export const apiClient = {
    // =========================
    // AUTENTICACIÓN
    // =========================

    register(email, password) {
        return request(
            '/api/auth/register',
            jsonOptions('POST', { email, password })
        );
    },

    login(email, password) {
        return request(
            '/api/auth/login',
            jsonOptions('POST', { email, password })
        );
    },

    async logout() {
        await request('/api/auth/logout', { method: 'POST' });
        return true;
    },

    async me() {
        try {
            return await request('/api/auth/me');
        } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
                return null;
            }

            throw error;
        }
    },

    resendVerification(email) {
        return request(
            '/api/auth/resend-verification',
            jsonOptions('POST', { email })
        );
    },

    // =========================
    // USUARIOS
    // =========================

    getUsers() {
        return request('/api/users');
    },

    getUserActive(id) {
        return request(`/api/users/${encodeURIComponent(id)}/active`);
    },

    async deleteUser(id) {
        await request(`/api/users/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        return true;
    }
};
