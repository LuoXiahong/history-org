import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { NotFound } from '../NotFound';

describe('NotFound', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  it('should render 404 heading', () => {
    renderWithRouter(<NotFound />);

    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('should render page not found message', () => {
    renderWithRouter(<NotFound />);

    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(
      screen.getByText("The page you're looking for doesn't exist or has been moved.")
    ).toBeInTheDocument();
  });

  it('should have a link to home page', () => {
    renderWithRouter(<NotFound />);

    const homeLink = screen.getByRole('link', { name: /back to home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
