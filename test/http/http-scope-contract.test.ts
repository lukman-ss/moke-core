import { expect } from 'chai';
import { Container } from '../../../src/container.js';

describe('HTTP Scope Contract - Acceptance Criteria', () => {
  let app: Container;

  beforeEach(() => {
    app = new Container();
  });

  describe('Request Scope Isolation', () => {
    class RequestContext {}
    class HttpRequest {}
    class HttpResponse {}
    class CurrentUser {}
    class Controller {}

    app.scoped(RequestContext);
    app.scoped(HttpRequest);
    app.scoped(HttpResponse);
    app.scoped(CurrentUser);
    app.scoped(Controller);

    it('should create child containers for each request', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      expect(request1).to.not.equal(request2);
    });

    it('should provide isolated RequestContext per request', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      const ctx1 = request1.resolve(RequestContext);
      const ctx2 = request2.resolve(RequestContext);

      expect(ctx1).to.not.equal(ctx2);
    });

    it('should provide isolated HttpRequest per request', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      const req1 = request1.resolve(HttpRequest);
      const req2 = request2.resolve(HttpRequest);

      expect(req1).to.not.equal(req2);
    });

    it('should provide isolated HttpResponse per request', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      const res1 = request1.resolve(HttpResponse);
      const res2 = request2.resolve(HttpResponse);

      expect(res1).to.not.equal(res2);
    });

    it('should provide isolated CurrentUser per request', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      const user1 = request1.resolve(CurrentUser);
      const user2 = request2.resolve(CurrentUser);

      expect(user1).to.not.equal(user2);
    });

    it('should provide isolated Controller per request', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      const ctrl1 = request1.resolve(Controller);
      const ctrl2 = request2.resolve(Controller);

      expect(ctrl1).to.not.equal(ctrl2);
    });
  });

  describe('Singleton Infrastructure', () => {
    class HttpServer {}
    class Router {}

    app.singleton(HttpServer);
    app.singleton(Router);

    it('should share HttpServer singleton across all containers', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      expect(request1.resolve(HttpServer)).to.equal(request2.resolve(HttpServer));
      expect(request1.resolve(HttpServer)).to.equal(app.resolve(HttpServer));
    });

    it('should share Router singleton across all containers', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      expect(request1.resolve(Router)).to.equal(request2.resolve(Router));
      expect(request1.resolve(Router)).to.equal(app.resolve(Router));
    });
  });

  describe('Mixed Scoped and Singleton Dependencies', () => {
    class DatabasePool {}
    class DatabaseConfig {}
    class RequestUnitOfWork {}
    class Repository {}

    app.singleton(DatabasePool);
    app.instance(DatabaseConfig, { host: 'localhost', port: 5432 });
    app.scoped(RequestUnitOfWork);
    app.scoped(Repository);

    it('singleton DatabasePool shared globally', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      expect(req1.resolve(DatabasePool)).to.equal(req2.resolve(DatabasePool));
    });

    it('instance DatabaseConfig shared globally', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      expect(req1.resolve(DatabaseConfig)).to.equal(req2.resolve(DatabaseConfig));
      expect(req1.resolve(DatabaseConfig).port).to.equal(5432);
    });

    it('scoped RequestUnitOfWork isolated per request', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      expect(req1.resolve(RequestUnitOfWork)).to.not.equal(req2.resolve(RequestUnitOfWork));
    });

    it('scoped Repository isolated per request', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      expect(req1.resolve(Repository)).to.not.equal(req2.resolve(Repository));
    });
  });

  describe('Controller with Dependencies', () => {
    class Logger {}
    class UserService {}
    class UserController {}

    app.singleton(Logger);
    app.scoped(UserService);
    app.scoped(UserController);

    it('controller with singleton and scoped deps', () => {
      const req1 = app.createChild();
      const req2 = app.createChild();

      const ctrl1 = req1.resolve(UserController);
      const ctrl2 = req2.resolve(UserController);

      expect(ctrl1).to.not.equal(ctrl2);

      expect((ctrl1 as any).logger).to.equal((ctrl2 as any).logger);
      expect((ctrl1 as any).userService).to.not.equal((ctrl2 as any).userService);
    });
  });
});
