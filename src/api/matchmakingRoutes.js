import { Router } from 'express';

import { sendError } from './httpErrors.js';
import { info, error as logError } from '../lib/logger.js';

export function matchmakingRoutes(userService, matchmakingService) {
    const router = Router();

    const auth = (req, res, next) =>
        req.session.userId
            ? next()
            : res.status(401).json({ error: 'UNAUTHENTICATED' });

    async function getRequester(req, res) {
        const requester = await userService.getUserOrNull(req.session.userId);

        if (!requester) {
            res.status(401).json({ error: 'UNAUTHENTICATED' });
            return null;
        }

        if (!requester.active) {
            res.status(403).json({ error: 'ACCOUNT_PENDING' });
            return null;
        }

        return requester;
    }

    // Entrar en la cola. Si ya hay otro jugador esperando, devuelve la partida.
    router.post('/join', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            const result = await matchmakingService.join(requester);

            if (result.status === 'matched') {
                info(
                    'Partida creada',
                    result.match.id,
                    requester.email
                );
            }

            res.json(result);
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Consultar el estado de la búsqueda o la partida asignada.
    router.get('/status', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            res.json(await matchmakingService.getStatus(requester));
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Salir de la cola. No cancela una partida ya creada.
    router.post('/leave', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            res.json(await matchmakingService.leave(requester));
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Consultar una partida concreta (solo sus jugadores).
    router.get('/matches/:id', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            res.json(
                await matchmakingService.getMatch(
                    requester,
                    req.params.id
                )
            );
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    return router;
}
