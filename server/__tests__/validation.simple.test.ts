import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  issnSchema,
} from '../_core/validation';

describe('Basic Validation Schemas', () => {
  describe('emailSchema', () => {
    it('should validate correct emails', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid emails', () => {
      const result = emailSchema.safeParse('invalid-email');
      expect(result.success).toBe(false);
    });

    it('should normalize email case', () => {
      const result = emailSchema.safeParse('TEST@EXAMPLE.COM');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });
  });

  describe('passwordSchema', () => {
    it('should validate strong passwords', () => {
      const result = passwordSchema.safeParse('StrongPass123');
      expect(result.success).toBe(true);
    });

    it('should reject weak passwords', () => {
      const result = passwordSchema.safeParse('weak');
      expect(result.success).toBe(false);
    });

    it('should reject passwords without numbers', () => {
      const result = passwordSchema.safeParse('WeakPassword');
      expect(result.success).toBe(false);
    });
  });

  describe('nameSchema', () => {
    it('should validate correct names', () => {
      expect(nameSchema.safeParse('João Silva').success).toBe(true);
      expect(nameSchema.safeParse('Maria José da Silva').success).toBe(true);
    });

    it('should reject invalid names', () => {
      expect(nameSchema.safeParse('A').success).toBe(false); // muito curto
      expect(nameSchema.safeParse('João123').success).toBe(false); // números
    });
  });

  describe('phoneSchema', () => {
    it('should validate correct phone numbers', () => {
      expect(phoneSchema.safeParse('+5511999999999').success).toBe(true);
      expect(phoneSchema.safeParse('11999999999').success).toBe(true);
    });

    it('should allow undefined phone numbers', () => {
      expect(phoneSchema.safeParse(undefined).success).toBe(true);
    });
  });

  describe('issnSchema', () => {
    it('should validate correct ISSN formats', () => {
      expect(issnSchema.safeParse('1234-5678').success).toBe(true);
      expect(issnSchema.safeParse('0000-000X').success).toBe(true);
    });

    it('should reject invalid ISSN formats', () => {
      expect(issnSchema.safeParse('12345678').success).toBe(false); // sem hífen
      expect(issnSchema.safeParse('abcd-efgh').success).toBe(false); // letras
    });
  });
});
