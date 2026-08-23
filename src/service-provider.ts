export abstract class ServiceProvider {
  constructor(protected readonly app: import('./application.js').MokeApplicationContext) {}

  register?(): void | Promise<void>;
  boot?(): void | Promise<void>;
  shutdown?(): void | Promise<void>;
}
