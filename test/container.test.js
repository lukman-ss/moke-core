import { expect } from 'chai';
import { Container } from '../src/container.js';
import { createToken } from '../src/types.js';
describe('Container', () => {
    let container;
    beforeEach(() => {
        container = new Container();
    });
    it('should resolve class dependency (singleton by default)', () => {
        class ServiceA {
        }
        container.singleton(ServiceA);
        const instance1 = container.resolve(ServiceA);
        const instance2 = container.resolve(ServiceA);
        expect(instance1).to.be.instanceOf(ServiceA);
        expect(instance1).to.equal(instance2);
    });
    it('should resolve transient dependency', () => {
        class ServiceB {
        }
        container.transient(ServiceB);
        const instance1 = container.resolve(ServiceB);
        const instance2 = container.resolve(ServiceB);
        expect(instance1).to.be.instanceOf(ServiceB);
        expect(instance1).to.not.equal(instance2);
    });
    it('should support instance provider', () => {
        const TOKEN = createToken('CONFIG');
        container.instance(TOKEN, 'my-config');
        const result = container.resolve(TOKEN);
        expect(result).to.equal('my-config');
    });
    it('should support factory provider', () => {
        const TOKEN = createToken('RANDOM');
        let counter = 0;
        container.factory(TOKEN, () => ++counter, 'transient');
        expect(container.resolve(TOKEN)).to.equal(1);
        expect(container.resolve(TOKEN)).to.equal(2);
    });
    it('should support existing provider', () => {
        class Logger {
        }
        const TOKEN = createToken('LOGGER');
        container.singleton(Logger);
        container.bind(TOKEN, { provide: TOKEN, useExisting: Logger });
        const logger1 = container.resolve(Logger);
        const logger2 = container.resolve(TOKEN);
        expect(logger1).to.equal(logger2);
    });
    it('should auto-bind unhandled classes as singleton', () => {
        class ServiceC {
        }
        const instance1 = container.resolve(ServiceC);
        const instance2 = container.resolve(ServiceC);
        expect(instance1).to.be.instanceOf(ServiceC);
        expect(instance1).to.equal(instance2);
    });
    it('should has() return true if bound', () => {
        class ServiceD {
        }
        container.singleton(ServiceD);
        expect(container.has(ServiceD)).to.be.true;
    });
});
//# sourceMappingURL=container.test.js.map