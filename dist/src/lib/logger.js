export const logger = {
    info: (message) => {
        console.log(`${getTimestamp()} | 🔵 INFO  | '${message}' |`);
    },
    error: (message) => {
        console.error(`${getTimestamp()} | 🔴 ERROR | '${message}' |`);
    },
    warn: (message) => {
        console.warn(`${getTimestamp()} | 🟡 WARN  | '${message}' |`);
    },
    debug: (message) => {
        console.debug(`${getTimestamp()} | 🟣 DEBUG | '${message}' |`);
    }
};
function getTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
}
//# sourceMappingURL=logger.js.map