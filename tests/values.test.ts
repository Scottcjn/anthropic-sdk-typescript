import { AnthropicError } from '@anthropic-ai/sdk/core/error';
import {
  coerceBoolean,
  coerceFloat,
  coerceInteger,
  ensurePresent,
  hasOwn,
  isAbsoluteURL,
  isEmptyObj,
  isObj,
  maybeCoerceBoolean,
  maybeCoerceFloat,
  maybeCoerceInteger,
  maybeObj,
  pop,
  safeJSON,
  validatePositiveInteger,
} from '@anthropic-ai/sdk/internal/utils/values';

describe('values utilities', () => {
  describe(isAbsoluteURL, () => {
    it('accepts scheme-prefixed URLs and rejects relative paths', () => {
      expect(isAbsoluteURL('https://api.anthropic.com/v1/messages')).toBe(true);
      expect(isAbsoluteURL('mailto:support@example.com')).toBe(true);
      expect(isAbsoluteURL('/v1/messages')).toBe(false);
      expect(isAbsoluteURL('../messages')).toBe(false);
      expect(isAbsoluteURL('api.anthropic.com/v1/messages')).toBe(false);
    });
  });

  describe('object helpers', () => {
    it('returns empty objects for non-objects while preserving object inputs', () => {
      const obj = { id: 'msg_123' };
      const arr = ['message'];

      expect(maybeObj(null)).toEqual({});
      expect(maybeObj(undefined)).toEqual({});
      expect(maybeObj('message')).toEqual({});
      expect(maybeObj(obj)).toBe(obj);
      expect(maybeObj(arr)).toBe(arr);
    });

    it('distinguishes empty, inherited, and own enumerable keys', () => {
      const inherited = Object.create({ inherited: true });
      const ownUndefined = { present: undefined };

      expect(isEmptyObj(null)).toBe(true);
      expect(isEmptyObj(undefined)).toBe(true);
      expect(isEmptyObj({})).toBe(true);
      expect(isEmptyObj(inherited)).toBe(false);
      expect(isEmptyObj(ownUndefined)).toBe(false);

      expect(hasOwn(inherited, 'inherited')).toBe(false);
      expect(hasOwn(ownUndefined, 'present')).toBe(true);
    });

    it('recognizes plain objects without treating arrays or nullish values as objects', () => {
      expect(isObj({ usage: { input_tokens: 1 } })).toBe(true);
      expect(isObj(Object.create(null))).toBe(true);
      expect(isObj([])).toBe(false);
      expect(isObj(null)).toBe(false);
      expect(isObj('message')).toBe(false);
    });
  });

  describe('presence and number validation', () => {
    it('returns present falsy values and throws for nullish values', () => {
      expect(ensurePresent(0)).toBe(0);
      expect(ensurePresent(false)).toBe(false);
      expect(ensurePresent('')).toBe('');

      expect(() => ensurePresent(null)).toThrow(AnthropicError);
      expect(() => ensurePresent(undefined)).toThrow('Expected a value');
    });

    it('validates non-negative integers with useful failures', () => {
      expect(validatePositiveInteger('limit', 0)).toBe(0);
      expect(validatePositiveInteger('limit', 42)).toBe(42);

      expect(() => validatePositiveInteger('limit', 1.5)).toThrow('limit must be an integer');
      expect(() => validatePositiveInteger('limit', '10')).toThrow('limit must be an integer');
      expect(() => validatePositiveInteger('limit', -1)).toThrow('limit must be a positive integer');
    });
  });

  describe('coercion helpers', () => {
    it('coerces numeric values and rejects unsupported types', () => {
      expect(coerceInteger(1.6)).toBe(2);
      expect(coerceInteger('42px')).toBe(42);
      expect(coerceFloat(1)).toBe(1);
      expect(coerceFloat('1.25ms')).toBe(1.25);

      expect(() => coerceInteger({})).toThrow(AnthropicError);
      expect(() => coerceFloat({})).toThrow('Could not coerce');
    });

    it('coerces booleans with exact string handling', () => {
      expect(coerceBoolean(true)).toBe(true);
      expect(coerceBoolean(false)).toBe(false);
      expect(coerceBoolean('true')).toBe(true);
      expect(coerceBoolean('false')).toBe(false);
      expect(coerceBoolean('TRUE')).toBe(false);
      expect(coerceBoolean(1)).toBe(true);
      expect(coerceBoolean(0)).toBe(false);
    });

    it('leaves nullish optional values undefined before coercion', () => {
      expect(maybeCoerceInteger(null)).toBeUndefined();
      expect(maybeCoerceFloat(undefined)).toBeUndefined();
      expect(maybeCoerceBoolean(null)).toBeUndefined();

      expect(maybeCoerceInteger('9.8')).toBe(9);
      expect(maybeCoerceFloat('9.8')).toBe(9.8);
      expect(maybeCoerceBoolean('true')).toBe(true);
    });
  });

  describe('JSON and mutation helpers', () => {
    it('parses valid JSON and returns undefined for invalid JSON', () => {
      expect(safeJSON('{"id":"msg_123","count":2}')).toEqual({ id: 'msg_123', count: 2 });
      expect(safeJSON('[1,2,3]')).toEqual([1, 2, 3]);
      expect(safeJSON('{not json')).toBeUndefined();
      expect(safeJSON('')).toBeUndefined();
    });

    it('pops existing and missing keys while mutating only the requested key', () => {
      const payload = { id: 'msg_123', model: 'claude', metadata: { tag: 'unit' } };

      expect(pop(payload, 'model')).toBe('claude');
      expect(payload).toEqual({ id: 'msg_123', metadata: { tag: 'unit' } });

      expect(pop(payload, 'missing')).toBeUndefined();
      expect(payload).toEqual({ id: 'msg_123', metadata: { tag: 'unit' } });
    });
  });
});
