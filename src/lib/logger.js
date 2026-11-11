const enabled = process.env.NODE_ENV !== 'test';

function write(level, args) {
    if (!enabled) return;

    const line = `[${new Date().toISOString()}] [${level}]`;

    if (level === 'ERROR') {
        console.error(line, ...args);
    } else if (level === 'WARN') {
        console.warn(line, ...args);
    } else {
        console.log(line, ...args);
    }
}

export function info(...args) {
    write('INFO', args);
}

export function warn(...args) {
    write('WARN', args);
}

export function error(...args) {
    write('ERROR', args);
}
