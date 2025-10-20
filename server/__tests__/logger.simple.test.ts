import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '../_core/logger';

describe('Logger Basic Functionality', () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'debug';
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log error messages', () => {
    logger.error('Test error message');
    expect(consoleSpy).toHaveBeenCalled();
    
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('ERROR');
    expect(logCall).toContain('Test error message');
  });

  it('should log warning messages', () => {
    logger.warn('Test warning message');
    expect(consoleSpy).toHaveBeenCalled();
    
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('WARN');
    expect(logCall).toContain('Test warning message');
  });

  it('should log info messages', () => {
    logger.info('Test info message');
    expect(consoleSpy).toHaveBeenCalled();
    
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('INFO');
    expect(logCall).toContain('Test info message');
  });

  it('should include context in logs', () => {
    const context = {
      userId: 'user-123',
      requestId: 'req-456',
    };

    logger.info('Test message with context', context);
    expect(consoleSpy).toHaveBeenCalled();
    
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('user-123');
    expect(logCall).toContain('req-456');
  });

  it('should sanitize sensitive information from context', () => {
    const context = {
      userId: 'user-123',
      password: 'secret-password',
      safeData: 'this-is-safe',
    };

    logger.info('Test message with sensitive context', context);
    expect(consoleSpy).toHaveBeenCalled();
    
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('user-123');
    expect(logCall).toContain('this-is-safe');
    expect(logCall).not.toContain('secret-password');
  });

  it('should log security events', () => {
    logger.security('Failed login attempt', { ip: '192.168.1.1' });
    expect(consoleSpy).toHaveBeenCalled();
    
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('SECURITY_EVENT');
    expect(logCall).toContain('Failed login attempt');
  });

  it('should log authentication events', () => {
    logger.auth('User logged in', { userId: 'user-123' });
    expect(consoleSpy).toHaveBeenCalled();
    
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('AUTH');
    expect(logCall).toContain('User logged in');
  });

  it('should log API requests', () => {
    logger.api('GET', '/api/users', { requestId: 'req-123' });
    expect(consoleSpy).toHaveBeenCalled();
    
    const logCall = consoleSpy.mock.calls[0][0];
    expect(logCall).toContain('API_REQUEST');
    expect(logCall).toContain('GET /api/users');
  });
});
