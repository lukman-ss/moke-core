export class ConsoleLogger {
    context;
    constructor(context) {
        this.context = context;
    }
    log(message, context) {
        console.log(this.format('LOG', message, context));
    }
    debug(message, context) {
        console.debug(this.format('DEBUG', message, context));
    }
    warn(message, context) {
        console.warn(this.format('WARN', message, context));
    }
    error(message, trace, context) {
        console.error(this.format('ERROR', message, context), trace ? `\n${trace}` : '');
    }
    format(level, message, context) {
        const ctx = context || this.context;
        return `[Moke] ${level} ${ctx ? `[${ctx}] ` : ''}${message}`;
    }
}
//# sourceMappingURL=logger.js.map