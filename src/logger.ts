export class MokeLogger {
  log(message: string) {
    console.log(`[Moke] ${message}`);
  }

  error(message: string, trace?: string) {
    console.error(`[Moke ERROR] ${message}`, trace || '');
  }
}
