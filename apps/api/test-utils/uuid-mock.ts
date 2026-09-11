// Jest CJS-compatible stand-in for `uuid` (ESM-only from v9+, Jest's default
// transform can't parse `export` in node_modules). Wired via moduleNameMapper
// in jest.config.cts — used only in tests, never in the app build.
import { randomUUID } from 'crypto';

export const v4 = (): string => randomUUID();
