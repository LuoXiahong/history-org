import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ToastProvider } from '../ToastProvider';

describe('ToastProvider', () => {
  it('should render without crashing', () => {
    const { container } = render(<ToastProvider />);

    // Toaster component should be present in the DOM
    expect(container).toBeInTheDocument();
  });

  it('should render Toaster component from sonner', () => {
    const { container } = render(<ToastProvider />);

    // The Toaster creates a section element
    const toaster = container.querySelector('section');
    expect(toaster).toBeInTheDocument();
  });
});
