export class MokeLogger {
    log(message) {
        console.log(`[Moke] ${message}`);
    }
    error(message, trace) {
        console.error(`[Moke ERROR] ${message}`, trace || '');
    }
}
//# sourceMappingURL=logger.js.map