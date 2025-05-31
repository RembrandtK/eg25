import '@testing-library/jest-dom'

// Polyfills for viem and crypto operations
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill fetch and Request for viem
require('whatwg-fetch');

// Add Request polyfill if not available
if (typeof global.Request === 'undefined') {
  global.Request = class MockRequest {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = init.headers || {};
      this.body = init.body;
    }
  };
}

// Mock crypto.getRandomValues if not available
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  };
}

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }) => children,
}))

// Mock window.MiniKit
Object.defineProperty(window, 'MiniKit', {
  value: {
    install: jest.fn(),
    isInstalled: jest.fn(() => true),
    commands: {
      walletAuth: jest.fn(),
    },
  },
  writable: true,
})
