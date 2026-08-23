export interface Logger {
    debug?(message: string, context?: string): void;
    log(message: string, context?: string): void;
    warn(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
}
export declare class ConsoleLogger implements Logger {
    private readonly context?;
    constructor(context?: string | undefined);
    log(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    warn(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    private format;
}
//# sourceMappingURL=logger.d.ts.map