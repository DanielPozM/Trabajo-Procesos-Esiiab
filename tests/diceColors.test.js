import test from 'node:test';
import assert from 'node:assert/strict';

import {
    BASE_DICE_COLOR,
    DICE_COLORS,
    NO_REWARD_WEIGHT,
    capRewardHistory,
    diceColorState,
    normalizeDiceColors,
    rollDiceColor,
    selectedDiceColor
} from '../src/lib/diceColors.js';

function fixed(value) {
    return () => value;
}

test('el catálogo reparte un 90 % de premios y un 10 % sin recompensa', () => {
    const rewardWeight = DICE_COLORS.reduce(
        (total, color) => total + color.weight,
        0
    );

    assert.equal(rewardWeight, 90);
    assert.equal(rewardWeight + NO_REWARD_WEIGHT, 100);
    assert.equal(
        DICE_COLORS.find(color => color.id === BASE_DICE_COLOR).weight,
        0
    );
});

test('el sorteo respeta los tramos de cada color', () => {
    const cases = [
        [0, 'green'],
        [49, 'green'],
        [50, 'blue'],
        [69, 'blue'],
        [70, 'purple'],
        [79, 'purple'],
        [80, 'yellow'],
        [84, 'yellow'],
        [85, 'red'],
        [88, 'red'],
        [89, 'pink'],
        [90, null],
        [99, null]
    ];

    for (const [roll, expected] of cases) {
        assert.equal(rollDiceColor(fixed(roll)), expected, `tirada ${roll}`);
    }
});

test('el gris siempre está desbloqueado y los colores se normalizan', () => {
    assert.deepEqual(normalizeDiceColors(undefined), ['gray']);
    assert.deepEqual(
        normalizeDiceColors(['blue', 'blue', 'inventado', 'gray']),
        ['gray', 'blue']
    );
});

test('el color seleccionado cae al gris si no está desbloqueado', () => {
    assert.equal(
        selectedDiceColor({ diceColors: ['gray'], selectedDiceColor: 'blue' }),
        'gray'
    );
    assert.equal(
        selectedDiceColor({
            diceColors: ['gray', 'blue'],
            selectedDiceColor: 'blue'
        }),
        'blue'
    );
});

test('el estado de colores marca bloqueados y seleccionado', () => {
    const state = diceColorState({
        diceColors: ['gray', 'green'],
        selectedDiceColor: 'green'
    });

    const green = state.colors.find(color => color.id === 'green');
    const blue = state.colors.find(color => color.id === 'blue');

    assert.equal(state.selected, 'green');
    assert.equal(green.unlocked, true);
    assert.equal(green.selected, true);
    assert.equal(blue.unlocked, false);
    assert.equal(blue.weight, 20);
});

test('el historial de premios se recorta por la cola', () => {
    const rewards = Object.fromEntries(
        Array.from({ length: 105 }, (_, index) => [
            `match_${index}`,
            { colorId: 'green' }
        ])
    );

    const capped = capRewardHistory(rewards);

    assert.equal(Object.keys(capped).length, 100);
    assert.equal(capped.match_0, undefined);
    assert.equal(capped.match_104.colorId, 'green');
});
