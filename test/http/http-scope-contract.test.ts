import { expect } from 'chai';
import { Container } from '../../src/container.js';

describe('HTTP Scope Contract - Acceptance Criteria', () => {
  let app: Container;

  beforeEach(() => {
    app = new Container();
  });

  describe('Request Scope Isolation', () => {
    it('should create child containers for each request', () => {
      const request1 = app.createChild();
      const request2 = app.createChild();

      expect(request1).to.not.equal(request2);
    });

    it('should provide isolated RequestContext per request', () => {
      class RequestContext {}
      app.scoped(RequestContext);

      const request1 = app.createChild();
      const request2 = app.createChild();

      const ctx1 = request1.resolve(RequestContext);
      const ctx2 = request2.resolve(RequestContext);

      expect(ctx1).to.not.equal(ctx2);
    });

    it('should provide isolated HttpRequest per request', () => {
      class HttpRequest {}
      app.scoped(HttpRequest);

      const request1 = app.createChild();
      const request2 = app.createChild();

      const req1 = request1.resolve(HttpRequest);
      const req2 = request2.resolve(HttpRequest);

      expect(req1).to.not.equal(req2);
    });

    it('should provide isolated HttpResponse per request', () => {
      class HttpResponse {}
      app.scoped(HttpResponse);

      const request1 = app.createChild();
      const request2 = app.createChild();

      const res1 = request1.resolve(HttpResponse);
      const res2 = request2.resolve(HttpResponse);

      expect(res1).to.not.equal(res2);
    });

    it('should provide isolated CurrentUser per request', () => {
      class CurrentUser {}
      app.scoped(CurrentUser);

      const request1 = app.createChild();
      const request2 = app.createChild();

      const user1 = request1.resolve(CurrentUser);
      const user2 = request2.resolve(CurrentUser);

      expect(user1).to.not.equal(user2);
    });

    it('should provide isolated Controller per request', () => {
      class Controller {}
      app.scoped(Controller);

      const request1 = app.createChild();
      const request2 = app.createChild();

      const ctrl1 = request1.resolve(Controller);
      const ctrl2 = request2.resolve(Controller);

      expect(ctrl1).to.not.equal(ctrl2);
    });
  });

  describe('Singleton Infrastructure', () => {
    it('should share HttpServer singleton across all containers', () => {
      class HttpServer {}
      app.singleton(HttpServer);

      const request1 = app.createChild();
      const request2 = app.createChild();

      expect(request1.resolve(HttpServer)).to.equal(request2.resolve(HttpServer));
      expect(request1.resolve(HttpServer)).to.equal(app.resolve(HttpServer));
    });

    it('should share Router singleton across all containers', () => {
      class Router {}
      app.singleton(Router);

      const request1 = app.createChild();
      const request2 = app.createChild();

      expect(request1.resolve(Router)).to.equal(request2.resolve(Router));
      expect(request1.resolve(Router)).to.equal(app.resolve(Router));
    });
  });

  describe('Mixed Scoped and Singleton Dependencies', () => {
    it('singleton DatabasePool shared globally', () => {
      class DatabasePool {}
      app.singleton(DatabasePool);

      const req1 = app.createChild();
      const req2 = app.createChild();

      expect(req1.resolve(DatabasePool)).to.equal(req2.resolve(DatabasePool));
    });

    it('instance DatabaseConfig shared globally', () => {
      const DatabaseConfig = { host: 'localhost', port: 5432 };
      app.instance('DatabaseConfig', DatabaseConfig);

      const req1 = app.createChild();
      const req2 = app.createChild();

      expect(req1.resolve('DatabaseConfig')).to.equal(req2.resolve('DatabaseConfig'));
      expect(req1.resolve('DatabaseConfig').port).to.equal(5432);
    });

    it('scoped RequestUnitOfWork isolated per request', () => {
      class RequestUnitOfWork {}
      app.scoped(RequestUnitOfWork);

      const req1 = app.createChild();
      const req2 = app.createChild();

      expect(req1.resolve(RequestUnitOfWork)).to.not.equal(req2.resolve(RequestUnitOfWork));
    });

    it('scoped Repository isolated per request', () => {
      class Repository {}
      app.scoped(Repository);

      const req1 = app.createChild();
      const req2 = app.createChild();

      expect(req1.resolve(Repository)).to.not.equal(req2.resolve(Repository));
    });
  });
});
