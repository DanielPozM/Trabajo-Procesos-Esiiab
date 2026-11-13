import crypto from 'crypto';

/**
 * Catálogo de colores de dados.
 *
 * `weight` es el porcentaje de aparición al ganar una partida. Los pesos de
 * los colores desbloqueables suman 90; el 10 % restante no otorga premio.
 * El gris es el color base: siempre está disponible y nunca se sortea.
 */
export const BASE_DICE_COLOR = 'gray';
export const NO_REWARD_WEIGHT = 10;

export const DICE_COLORS = Object.freeze([
    {
        id: 'gray',
        name: 'Gris',
        base: true,
        weight: 0,
        swatch: '#9ca3af'
    },
    {
        id: 'green',
        name: 'Verde',
        base: false,
        weight: 50,
        swatch: '#2f9e5f'
    },
    {
        id: 'blue',
        name: 'Azul',
        base: false,
        weight: 20,
        swatch: '#3b82c4'
    },
    {
        id: 'purple',
        name: 'Morado',
        base: false,
        weight: 10,
        swatch: '#8b5cf6'
    },
    {
        id: 'yellow',
        name: 'Amarillo',
        base: false,
        weight: 5,
        swatch: '#e0b34e'
    },
    {
        id: 'red',
        name: 'Rojo',
        base: false,
        weight: 4,
        swatch: '#c1483b'
    },
    {
        id: 'pink',
        name: 'Rosa',
        base: false,
        weight: 1,
        swatch: '#e26fa4'
    }
]);

const COLOR_BY_ID = new Map(DICE_COLORS.map(color => [color.id, color]));
const REWARD_COLORS = DICE_COLORS.filter(color => color.weight > 0);
const REWARD_HISTORY_LIMIT = 100;

const TOTAL_REWARD_WEIGHT =
    REWARD_COLORS.reduce((total, color) => total + color.weight, 0) +
    NO_REWARD_WEIGHT;

export function isDiceColor(colorId) {
    return COLOR_BY_ID.has(String(colorId || ''));
}

export function isRewardColor(colorId) {
    const color = COLOR_BY_ID.get(String(colorId || ''));
    return Boolean(color && !color.base);
}

/**
 * El gris siempre está desbloqueado. Cualquier valor desconocido se ignora
 * para no romper perfiles antiguos o datos manipulados.
 */
export function normalizeDiceColors(diceColors) {
    const unlocked = [BASE_DICE_COLOR];

    for (const colorId of Array.isArray(diceColors) ? diceColors : []) {
        if (isDiceColor(colorId) && !unlocked.includes(colorId)) {
            unlocked.push(colorId);
        }
    }

    return unlocked;
}

export function selectedDiceColor(user) {
    const unlocked = normalizeDiceColors(user?.diceColors);
    const selected = String(user?.selectedDiceColor || '');

    return unlocked.includes(selected) ? selected : BASE_DICE_COLOR;
}

/**
 * Sortea un color con las probabilidades del enunciado.
 * Devuelve `null` cuando la tirada cae en el 10 % sin premio.
 */
export function rollDiceColor(randomInt = crypto.randomInt) {
    const roll = randomInt(0, TOTAL_REWARD_WEIGHT);
    let accumulated = 0;

    for (const color of REWARD_COLORS) {
        accumulated += color.weight;

        if (roll < accumulated) {
            return color.id;
        }
    }

    return null;
}

export function diceColorState(user) {
    const unlocked = normalizeDiceColors(user?.diceColors);
    const selected = selectedDiceColor(user);

    return {
        selected,
        colors: DICE_COLORS.map(color => ({
            id: color.id,
            name: color.name,
            base: color.base,
            weight: color.weight,
            swatch: color.swatch,
            unlocked: unlocked.includes(color.id),
            selected: color.id === selected
        }))
    };
}

/**
 * Guarda solo las últimas recompensas para que el documento del usuario no
 * crezca sin límite. Las partidas antiguas ya no se pueden volver a premiar.
 */
export function capRewardHistory(rewards) {
    const entries = Object.entries(rewards || {});

    if (entries.length <= REWARD_HISTORY_LIMIT) {
        return rewards || {};
    }

    return Object.fromEntries(
        entries.slice(entries.length - REWARD_HISTORY_LIMIT)
    );
}
