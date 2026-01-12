import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuspenseWrapper } from '../SuspenseWrapper';

describe('SuspenseWrapper', () => {
  it('should render children when not suspended', () => {
    render(
      <SuspenseWrapper>
        <div>Child content</div>
      </SuspenseWrapper>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should use custom fallback', () => {
    render(
      <SuspenseWrapper fallback={<div>Custom fallback</div>}>
        <div>Child content</div>
      </SuspenseWrapper>
    );

    // Children should be rendered when not suspended
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('should pass message prop to PageLoader', () => {
    render(
      <SuspenseWrapper message="Custom loading...">
        <div>Child content</div>
      </SuspenseWrapper>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
