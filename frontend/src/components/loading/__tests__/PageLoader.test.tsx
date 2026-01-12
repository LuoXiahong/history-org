import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageLoader } from '../PageLoader';

describe('PageLoader', () => {
  it('should render default loading message', () => {
    render(<PageLoader />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render custom loading message', () => {
    render(<PageLoader message="Fetching data..." />);

    expect(screen.getByText('Fetching data...')).toBeInTheDocument();
  });

  it('should render spinner element', () => {
    const { container } = render(<PageLoader />);

    // Check for the spinner (has animate-spin class)
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });
});
