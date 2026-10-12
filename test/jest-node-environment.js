/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Jest environment for route handler tests: real Node globals (Request, Response,
 * AbortSignal.timeout) plus a minimal `window` so the shared jest.setup.ts
 * (written for jsdom) can run. Used via the docblock in route.test.ts.
 */
const { TestEnvironment: NodeEnvironment } = require('jest-environment-node');

class NodeWithWindowEnvironment extends NodeEnvironment {
    async setup() {
        await super.setup();
        if (typeof this.global.window === 'undefined') {
            this.global.window = {};
        }
    }
}

module.exports = NodeWithWindowEnvironment;
