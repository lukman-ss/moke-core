import { expect } from 'chai';
import { Container, createToken } from '../../../src/container.js';
import { Injectable, Inject } from '../../../src/decorators.js';

describe('HTTP Singleton Infrastructure Contract', () => {
  let app: Container;

  beforeEach(() => {
    app = new Container();
  });

  describe('HttpServer Singleton', () => {
    @Injectable()
    class HttpServer {
      public port: number;
      
      constructor() {
        this.port = 8080;
      }

      start() {
        return `Server started on port ${this.port}`;
      }
    }

    app.singleton(HttpServer);

    it('single global instance across all requests', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      const server1 = request1.resolve(HttpServer);
      const server2 = request2.resolve(HttpServer);
      const rootServer = app.resolve(HttpServer);

      expect(server1).to.equal(server2);
      expect(server1).to.equal(rootServer);
      expect(server1.port).to.equal(8080);
    });

    it('maintains state across resolutions', () => {
      const request1 = app.createChild();
      const server1 = request1.resolve(HttpServer);
      server1.port = 3000;

      const request2 = app.createChild();
      const server2 = request2.resolve(HttpServer);

      expect(server2.port).to.equal(3000);
    });
  });

  describe('Router Singleton', () => {
    const ROUTES = createToken<any[]>('ROUTES');

    @Injectable()
    class Router {
      constructor(@Inject(ROUTES) private routes: any[]) {}

      addRoute(path: string, handler: Function) {
        this.routes.push({ path, handler });
      }

      getRoutes() {
        return this.routes.length;
      }
    }

    app.instance(ROUTES, []);
    app.singleton(Router);

    it('single router instance with shared routes', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      const router1 = req1.resolve(Router);
      const router2 = req2.resolve(Router);

      expect(router1).to.equal(router2);

      router1.addRoute('/users', () => {});
      expect(router2.getRoutes()).to.equal(1);
    });
  });

  describe('Request Scoped Services', () => {
    @Injectable()
    class HttpRequest {
      public id: string;
      public method: string;
      public url: string;

      constructor() {
        this.id = Math.random().toString(36).substr(2, 9);
        this.method = 'GET';
        this.url = '/';
      }
    }

    @Injectable()
    class HttpResponse {
      public statusCode: number;
      public headers: Map<string, string>;

      constructor() {
        this.statusCode = 200;
        this.headers = new Map();
      }

      setHeader(key: string, value: string) {
        this.headers.set(key, value);
      }
    }

    app.scoped(HttpRequest);
    app.scoped(HttpResponse);

    it('isolated request instances', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      const request1 = req1.resolve(HttpRequest);
      const request2 = req2.resolve(HttpRequest);

      const response1 = req1.resolve(HttpResponse);
      const response2 = req2.resolve(HttpResponse);

      expect(request1).to.not.equal(request2);
      expect(response1).to.not.equal(response2);
      expect(request1.id).to.not.equal(request2.id);
    });

    it('same instance within same request', () => {
      const requestContainer = app.createChild();

      const req1 = requestContainer.resolve(HttpRequest);
      const req2 = requestContainer.resolve(HttpRequest);

      expect(req1).to.equal(req2);
    });
  });

  describe('CurrentUser Scoped', () => {
    @Injectable()
    class AuthService {}

    @Injectable()
    class CurrentUser {
      public id: number;
      public username: string;

      constructor(@Inject(AuthService) private auth: AuthService) {
        this.id = 1;
        this.username = 'user';
      }
    }

    app.singleton(AuthService);
    app.scoped(CurrentUser);

    it('shared AuthService across users', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      const user1 = req1.resolve(CurrentUser);
      const user2 = req2.resolve(CurrentUser);

      expect(user1).to.not.equal(user2);
      expect((user1 as any).auth).to.equal((user2 as any).auth);
    });

    it('user isolation per request', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      const user1 = req1.resolve(CurrentUser);
      const user2 = req2.resolve(CurrentUser);

      user1.username = 'alice';
      user2.username = 'bob';

      expect(user1.username).to.equal('alice');
      expect(user2.username).to.equal('bob');
    });
  });

  describe('Controller Scoped/Transient', () => {
    @Injectable()
    class UserService {}

    @Injectable()
    class UserController {
      constructor(
        @Inject(UserService) public userService: UserService
      ) {}
    }

    app.scoped(UserService);
    app.scoped(UserController);

    it('controllers isolated per request', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      const ctrl1 = req1.resolve(UserController);
      const ctrl2 = req2.resolve(UserController);

      expect(ctrl1).to.not.equal(ctrl2);
      expect(ctrl1.userService).to.not.equal(ctrl2.userService);
    });

    it('same instance within same request', () => {
      const requestContainer = app.createChild();

      const ctrl1 = requestContainer.resolve(UserController);
      const ctrl2 = requestContainer.resolve(UserController);

      expect(ctrl1).to.equal(ctrl2);
    });
  });

  describe('Complete HTTP Graph', () => {
    const HttpServerToken = createToken<any>('HttpServer');
    const RouterToken = createToken<any>('Router');
    const RequestToken = createToken<any>('HttpRequest');
    const ResponseToken = createToken<any>('HttpResponse');
    const ControllerToken = createToken<any>('UserController');

    app.singleton(HttpServerToken, {
      useFactory: () => ({ type: 'server' })
    });
    app.singleton(RouterToken, {
      useFactory: () => ({ type: 'router' })
    });
    app.scoped(RequestToken, {
      useFactory: () => ({ type: 'request', id: Math.random() })
    });
    app.scoped(ResponseToken, {
      useFactory: () => ({ type: 'response' })
    });
    app.scoped(ControllerToken, {
      useFactory: (resolver) => ({
        type: 'controller',
        request: resolver.resolve(RequestToken),
        response: resolver.resolve(ResponseToken),
        server: resolver.resolve(HttpServerToken),
        router: resolver.resolve(RouterToken)
      })
    });

    it('resolves correct graph with proper scopes', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      const ctrl1 = req1.resolve(ControllerToken);
      const ctrl2 = req2.resolve(ControllerToken);

      expect(ctrl1.server).to.equal(ctrl2.server);
      expect(ctrl1.router).to.equal(ctrl2.router);
      expect(ctrl1.request).to.not.equal(ctrl2.request);
      expect(ctrl1.response).to.not.equal(ctrl2.response);
    });
  });
});
