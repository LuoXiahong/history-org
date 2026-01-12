import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { useToast } from '../useToast';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

describe('useToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show success toast', () => {
    const { result } = renderHook(() => useToast());

    result.current.success('Success message');

    expect(toast.success).toHaveBeenCalledWith('Success message', {
      duration: undefined,
      description: undefined,
      action: undefined,
    });
  });

  it('should show error toast with longer default duration', () => {
    const { result } = renderHook(() => useToast());

    result.current.error('Error message');

    expect(toast.error).toHaveBeenCalledWith('Error message', {
      duration: 6000,
      description: undefined,
      action: undefined,
    });
  });

  it('should show error toast with custom duration', () => {
    const { result } = renderHook(() => useToast());

    result.current.error('Error message', { duration: 3000 });

    expect(toast.error).toHaveBeenCalledWith('Error message', {
      duration: 3000,
      description: undefined,
      action: undefined,
    });
  });

  it('should show warning toast', () => {
    const { result } = renderHook(() => useToast());

    result.current.warning('Warning message');

    expect(toast.warning).toHaveBeenCalledWith('Warning message', {
      duration: undefined,
      description: undefined,
      action: undefined,
    });
  });

  it('should show info toast', () => {
    const { result } = renderHook(() => useToast());

    result.current.info('Info message');

    expect(toast.info).toHaveBeenCalledWith('Info message', {
      duration: undefined,
      description: undefined,
      action: undefined,
    });
  });

  it('should show loading toast', () => {
    const { result } = renderHook(() => useToast());

    result.current.loading('Loading...');

    expect(toast.loading).toHaveBeenCalledWith('Loading...');
  });

  it('should dismiss toast', () => {
    const { result } = renderHook(() => useToast());

    result.current.dismiss('toast-id');

    expect(toast.dismiss).toHaveBeenCalledWith('toast-id');
  });

  it('should handle promise toast', async () => {
    const { result } = renderHook(() => useToast());
    const testPromise = Promise.resolve('data');

    result.current.promise(testPromise, {
      loading: 'Loading...',
      success: 'Success!',
      error: 'Error!',
    });

    expect(toast.promise).toHaveBeenCalledWith(testPromise, {
      loading: 'Loading...',
      success: 'Success!',
      error: 'Error!',
    });
  });

  it('should pass action option to toast', () => {
    const { result } = renderHook(() => useToast());
    const action = { label: 'Retry', onClick: vi.fn() };

    result.current.success('Message', { action });

    expect(toast.success).toHaveBeenCalledWith('Message', {
      duration: undefined,
      description: undefined,
      action,
    });
  });

  it('should pass description option to toast', () => {
    const { result } = renderHook(() => useToast());

    result.current.success('Message', { description: 'Additional details' });

    expect(toast.success).toHaveBeenCalledWith('Message', {
      duration: undefined,
      description: 'Additional details',
      action: undefined,
    });
  });
});
