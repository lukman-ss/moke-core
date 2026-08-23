export interface Logger {
  debug?(message: string, context?: string): void;
  log(message: string, context?: string): void;
  warn(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
}

export class ConsoleLogger implements Logger {
  constructor(private readonly context?: string) {}

  log(message: string, context?: string) {
    console.log(this.format('LOG', message, context));
  }

  debug(message: string, context?: string) {
    console.debug(this.format('DEBUG', message, context));
  }

  warn(message: string, context?: string) {
    console.warn(this.format('WARN', message, context));
  }

  error(message: string, trace?: string, context?: string) {
    console.error(this.format('ERROR', message, context), trace ? `\n${trace}` : '');
  }

  private format(level: string, message: string, context?: string): string {
    const ctx = context || this.context;
    return `[Moke] ${level} ${ctx ? `[${ctx}] ` : ''}${message}`;
  }
}


