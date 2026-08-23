# @lukman-ss/moke-core

Core module for Moke web framework. Provides IoC Container, Dependency Injection, and Application Bootstrap.

## Features

- **Container**: IoC Container for resolving dependencies.
- **Decorators**: `@Injectable()` for class registration.
- **Factory**: `MokeFactory` to bootstrap the application.
- **Logger**: Standard `MokeLogger`.

## Usage

```typescript
import { Injectable, MokeFactory, MokeLogger } from '@lukman-ss/moke-core';

@Injectable()
class AppService {
  constructor(private logger: MokeLogger) {}
  
  run() {
    this.logger.log('App is running');
  }
}

@Injectable()
class AppModule {
  constructor(private appService: AppService) {}
  
  start() {
    this.appService.run();
  }
}

const app = MokeFactory.create(AppModule);
app.start();
```
