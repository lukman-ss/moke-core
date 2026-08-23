// README Example 1: @Injectable & @Inject
import { Injectable, Inject, createToken, Container } from '@lukman-ss/moke-core';

const CACHE = createToken<{ get: (key: string) => any }>('CACHE');

@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE) private readonly cache: { get: (key: string) => any }
  ) {}
}

// README Example 2: Container
const container = new Container();

container.singleton(UserService);

const service = container.resolve(UserService);