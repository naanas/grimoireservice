export const logger = {
    info: (message: string) => {
        console.log(`${getTimestamp()} | 🔵 INFO  | '${message}' |`);
    },
    error: (message: string) => {
        console.error(`${getTimestamp()} | 🔴 ERROR | '${message}' |`);
    },
    warn: (message: string) => {
        console.warn(`${getTimestamp()} | 🟡 WARN  | '${message}' |`);
    },
    debug: (message: string) => {
        console.debug(`${getTimestamp()} | 🟣 DEBUG | '${message}' |`);
    }
};

function getTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
}
