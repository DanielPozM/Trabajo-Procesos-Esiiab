import { Router } from 'express';

import { config } from '../config.js';
import { sendError } from './httpErrors.js';
import { info, error as logError } from '../lib/logger.js';

export function userRoutes(service) {
    const router = Router();

    const auth = (req, res, next) =>
        req.session.userId
            ? next()
            : res.status(401).json({ error: 'UNAUTHENTICATED' });

    async function getRequester(req, res) {
        const requester = await service.getUserOrNull(req.session.userId);

        if (!requester) {
            res.status(401).json({ error: 'UNAUTHENTICATED' });
            return null;
        }

        return requester;
    }

    // Listar usuarios: solo administrador.
    router.get('/', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            if (requester.role !== 'admin') {
                return res.status(403).json({ error: 'FORBIDDEN' });
            }

            info('Listado de usuarios solicitado por', requester.email);
            res.json(await service.listUsers());
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Colores de dados del propio usuario y estado de desbloqueo.
    router.get('/me/dice-colors', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            res.json(await service.getDiceColors(requester.id));
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Seleccionar un color ya desbloqueado.
    router.patch('/me/dice-color', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            const state = await service.selectDiceColor(
                requester.id,
                req.body?.colorId
            );

            info(
                'Color de dados actualizado',
                requester.email,
                state.selected
            );

            res.json(state);
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Comprobar si un usuario está activo: solo administrador.
    router.get('/:id/active', auth, async (req, res) => {
        try {
            const requester = await getRequester(req, res);
            if (!requester) return;

            if (requester.role !== 'admin') {
                return res.status(403).json({ error: 'FORBIDDEN' });
            }

            res.json({ active: await service.isActive(req.params.id) });
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    // Eliminar: administrador a cualquiera; usuario solo a sí mismo.
    router.delete('/:id', auth, async (req, res) => {
        try {
            await service.deleteUser(req.session.userId, req.params.id);

            const deletingSelf =
                String(req.session.userId) === String(req.params.id);

            if (deletingSelf) {
                await new Promise(resolve => {
                    req.session.destroy(() => resolve());
                });
                res.clearCookie(config.sessionCookieName);
            }

            res.status(204).end();
        } catch (error) {
            sendError(res, error, logError);
        }
    });

    return router;
}
