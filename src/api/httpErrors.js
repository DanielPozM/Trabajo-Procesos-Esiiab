const STATUS_BY_CODE = {
    EMAIL_INVALID: 400,
    PASSWORD_TOO_SHORT: 400,
    PASSWORD_TOO_LONG: 400,
    EMAIL_EXISTS: 409,
    INVALID_CREDENTIALS: 401,
    UNAUTHENTICATED: 401,
    ACCOUNT_PENDING: 403,
    OAUTH_ONLY: 409,
    FORBIDDEN: 403,
    USER_NOT_FOUND: 404,
    VERIFICATION_TOKEN_INVALID: 400,
    VERIFICATION_TOKEN_EXPIRED: 410,
    EMAIL_NOT_CONFIGURED: 503,
    EMAIL_SEND_FAILED: 502,
    RATE_LIMITED: 429,
    OAUTH_NOT_CONFIGURED: 503,
    OAUTH_STATE_INVALID: 400,
    OAUTH_CANCELLED: 400,
    OAUTH_EMAIL_MISSING: 400,
    OAUTH_EMAIL_NOT_VERIFIED: 403,
    OAUTH_EXCHANGE_FAILED: 502,
    MATCH_NOT_FOUND: 404,
    MATCH_VERSION_CONFLICT: 409,
    GAME_FINISHED: 409,
    NOT_YOUR_TURN: 409,
    BID_QUANTITY_INVALID: 400,
    BID_FACE_INVALID: 400,
    BID_TOO_LOW: 409,
    CANNOT_CHALLENGE: 400,
    INVALID_JSON: 400,
    PAYLOAD_TOO_LARGE: 413,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500
};

export function statusForError(error) {
    return STATUS_BY_CODE[error?.message] || 500;
}

export function sendError(res, error, logger) {
    const known = Boolean(error?.message && STATUS_BY_CODE[error.message]);
    const code = known ? error.message : 'INTERNAL_ERROR';

    if (!known && logger) {
        logger(error);
    }

    res.status(statusForError({ message: code })).json({ error: code });
}
