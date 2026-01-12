import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          padding: '16px',
          borderRadius: '8px',
        },
        className: 'toast-custom',
      }}
    />
  );
}
