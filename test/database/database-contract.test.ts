import { expect } from 'chai';
import { Container } from '../../src/container.js';
import { createToken } from '../../src/types.js';
import { Injectable, Inject } from '../../src/decorators.js';

describe('Database Contract', () => {
  let app: Container;

  beforeEach(() => {
    app = new Container();
  });

  describe('DatabasePool Singleton', () => {
    it('single pool instance across all containers', () => {
      @Injectable()
      class DatabasePool {
        public connections: number = 0;
      }

      app.singleton(DatabasePool);

      const req1 = app.createChild();
      const req2 = app.createChild();

      const pool1 = req1.resolve(DatabasePool);
      const pool2 = req2.resolve(DatabasePool);
      const rootPool = app.resolve(DatabasePool);

      expect(pool1).to.equal(pool2);
      expect(pool1).to.equal(rootPool);
    });

    it('connection tracking shared globally', () => {
      @Injectable()
      class DatabasePool {
        public connections: number = 0;
        acquire() {
          this.connections++;
          return `connection-${this.connections}`;
        }
      }

      app.singleton(DatabasePool);

      const req1 = app.createChild();
      const pool1 = req1.resolve(DatabasePool);

      pool1.acquire();
      pool1.acquire();

      const req2 = app.createChild();
      const pool2 = req2.resolve(DatabasePool);

      expect(pool2.connections).to.equal(2);
    });
  });

  describe('Config Singleton/Value', () => {
    it('configuration shared as singleton value', () => {
      const DatabaseConfig = createToken<any>('DatabaseConfig');

      app.instance(DatabaseConfig, {
        host: 'localhost',
        port: 5432,
        database: 'myapp',
        username: 'admin'
      });

      const req1 = app.createChild();
      const req2 = app.createChild();

      const config1 = req1.resolve(DatabaseConfig);
      const config2 = req2.resolve(DatabaseConfig);

      expect(config1).to.equal(config2);
      expect(config1.host).to.equal('localhost');
      expect(config1.port).to.equal(5432);
    });

    it('config immutable across requests', () => {
      const DatabaseConfig = createToken<any>('DatabaseConfig');

      app.instance(DatabaseConfig, {
        host: 'localhost',
        port: 5432,
        database: 'myapp'
      });

      const req = app.createChild();
      const config = req.resolve(DatabaseConfig);

      expect(config.database).to.equal('myapp');
    });
  });

  describe('RequestUnitOfWork Scoped', () => {
    it('isolated transaction unit per request', () => {
      @Injectable()
      class RequestUnitOfWork {
        public id: string;
        public queries: string[] = [];

        constructor() {
          this.id = `uow-${Math.random()}`;
        }
      }

      app.scoped(RequestUnitOfWork);

      const req1 = app.createChild();
      const req2 = app.createChild();

      const uow1 = req1.resolve(RequestUnitOfWork);
      const uow2 = req2.resolve(RequestUnitOfWork);

      expect(uow1).to.not.equal(uow2);
      expect(uow1.id).to.not.equal(uow2.id);
    });

    it('same unit within same request', () => {
      @Injectable()
      class RequestUnitOfWork {}

      app.scoped(RequestUnitOfWork);

      const requestContainer = app.createChild();

      const uow1 = requestContainer.resolve(RequestUnitOfWork);
      const uow2 = requestContainer.resolve(RequestUnitOfWork);

      expect(uow1).to.equal(uow2);
    });

    it('queries isolated between requests', () => {
      @Injectable()
      class RequestUnitOfWork {
        public queries: string[] = [];
        addQuery(sql: string) {
          this.queries.push(sql);
        }
      }

      app.scoped(RequestUnitOfWork);

      const req1 = app.createChild();
      const uow1 = req1.resolve(RequestUnitOfWork);
      uow1.addQuery('SELECT * FROM users');

      const req2 = app.createChild();
      const uow2 = req2.resolve(RequestUnitOfWork);
      uow2.addQuery('INSERT INTO logs');

      expect(uow1.queries).to.deep.equal(['SELECT * FROM users']);
      expect(uow2.queries).to.deep.equal(['INSERT INTO logs']);
    });
  });

  describe('Repository Scoped', () => {
    it('repositories isolated per request', () => {
      @Injectable()
      class DatabasePool {}
      @Injectable()
      class RequestUnitOfWork {}
      @Injectable()
      class UserRepository {}

      app.singleton(DatabasePool);
      app.scoped(RequestUnitOfWork);
      app.scoped(UserRepository);

      const req1 = app.createChild();
      const req2 = app.createChild();

      const userRepo1 = req1.resolve(UserRepository);
      const userRepo2 = req2.resolve(UserRepository);

      expect(userRepo1).to.not.equal(userRepo2);
    });

    it('shared pool between repositories', () => {
      @Injectable()
      class DatabasePool {}
      @Injectable()
      class RequestUnitOfWork {}
      @Injectable()
      class UserRepository {
        constructor(public pool: DatabasePool) {}
      }
      @Injectable()
      class LogRepository {
        constructor(public pool: DatabasePool) {}
      }

      app.singleton(DatabasePool);
      app.scoped(RequestUnitOfWork);
      app.scoped(UserRepository);
      app.scoped(LogRepository);

      const req1 = app.createChild();
      const req2 = app.createChild();

      const userRepo1 = req1.resolve(UserRepository);
      const logRepo1 = req1.resolve(LogRepository);
      const userRepo2 = req2.resolve(UserRepository);
      const logRepo2 = req2.resolve(LogRepository);

      expect(userRepo1.pool).to.equal(logRepo1.pool);
      expect(userRepo1.pool).to.equal(userRepo2.pool);
      expect(logRepo1.pool).to.equal(logRepo2.pool);
    });
  });

  describe('Complete Database Graph', () => {
    it('resolves correct scope graph without cycles', () => {
      const DatabaseConfig = createToken<any>('DatabaseConfig');

      @Injectable()
      class DatabasePool {
        constructor(@Inject(DatabaseConfig) public config: any) {}
      }
      @Injectable()
      class RequestUnitOfWork {
        constructor(public pool: DatabasePool) {}
      }
      @Injectable()
      class UserRepository {
        constructor(
          public pool: DatabasePool,
          public uow: RequestUnitOfWork
        ) {}
      }

      app.instance(DatabaseConfig, { host: 'localhost', port: 5432 });
      app.singleton(DatabasePool);
      app.scoped(RequestUnitOfWork);
      app.scoped(UserRepository);

      const req1 = app.createChild();
      const req2 = app.createChild();

      const repo1 = req1.resolve(UserRepository);
      const repo2 = req2.resolve(UserRepository);

      const uow1 = req1.resolve(RequestUnitOfWork);
      const uow2 = req2.resolve(RequestUnitOfWork);

      expect(repo1.pool).to.equal(repo2.pool);
      expect(repo1.uow).to.not.equal(repo2.uow);
      expect(uow1.pool).to.equal(repo1.pool);
      expect(repo1.uow).to.equal(uow1);
    });

    it('pool config shared globally', () => {
      const DatabaseConfig = createToken<any>('DatabaseConfig');

      @Injectable()
      class DatabasePool {
        constructor(@Inject(DatabaseConfig) public config: any) {}
      }

      app.instance(DatabaseConfig, { host: 'localhost', port: 5432 });
      app.singleton(DatabasePool);

      const req1 = app.createChild();
      const pool1 = req1.resolve(DatabasePool);

      expect(pool1.config.port).to.equal(5432);

      const req2 = app.createChild();
      const pool2 = req2.resolve(DatabasePool);

      expect(pool1).to.equal(pool2);
      expect(pool2.config.host).to.equal('localhost');
    });
  });
});
