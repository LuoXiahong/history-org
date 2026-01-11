import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from '../SearchInput';

describe('SearchInput', () => {
  it('should render with placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);

    expect(
      screen.getByPlaceholderText(/search persons, events/i),
    ).toBeInTheDocument();
  });

  it('should display custom placeholder when provided', () => {
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        placeholder="Custom placeholder"
      />,
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('should render current value', () => {
    render(<SearchInput value="Napoleon" onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('Napoleon')).toBeInTheDocument();
  });

  it('should call onChange when typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<SearchInput value="" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await user.type(input, 'N');

    expect(onChange).toHaveBeenCalledWith('N');
  });

  it('should show clear button when value is not empty', () => {
    render(<SearchInput value="test" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
  });

  it('should not show clear button when value is empty', () => {
    render(<SearchInput value="" onChange={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: /clear/i }),
    ).not.toBeInTheDocument();
  });

  it('should clear value when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<SearchInput value="test" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('should show loading indicator when isLoading is true', () => {
    const { container } = render(
      <SearchInput value="test" onChange={vi.fn()} isLoading />,
    );

    // Check for animate-spin class which indicates loading
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should autofocus when autoFocus is true', () => {
    render(<SearchInput value="" onChange={vi.fn()} autoFocus />);

    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});
