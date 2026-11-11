import { Router } from 'express';

import { sendError } from './httpErrors.js';
import { info, error as logError } from '../lib/logger.js';

export function gameRoutes(userService, gameService) {
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

    // Estado privado de la partida: cada jugador ve solo sus dados.
    router.get('/:id', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            res.json(await gameService.getState(requester, req.params.id));
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Subir la apuesta: cantidad y cara.
    router.post('/:id/bids', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            const state = await gameService.placeBid(
                requester,
                req.params.id,
                req.body || {}
            );

            info(
                'Apuesta registrada',
                req.params.id,
                requester.email,
                `${req.body?.quantity}x${req.body?.face}`
            );

            res.json(state);
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Acusar de mentira al rival.
    router.post('/:id/challenge', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            const state = await gameService.challenge(
                requester,
                req.params.id
            );

            info(
                'Mentira acusada',
                req.params.id,
                requester.email,
                state.lastResult?.bidIsTrue ? 'apuesta verdadera' : 'apuesta falsa'
            );

            res.json(state);
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    return router;
}
