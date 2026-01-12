import { toast } from 'sonner';

interface ToastOptions {
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration,
      description: options?.description,
      action: options?.action,
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration ?? 6000, // Longer duration for errors
      description: options?.description,
      action: options?.action,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      duration: options?.duration,
      description: options?.description,
      action: options?.action,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    toast.info(message, {
      duration: options?.duration,
      description: options?.description,
      action: options?.action,
    });
  };

  const loading = (message: string) => {
    return toast.loading(message);
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  const promise = <T,>(
    promiseValue: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: unknown) => string);
    },
  ) => {
    return toast.promise(promiseValue, messages);
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    promise,
  };
}
