import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonCard } from '../PersonCard';
import type { Person } from '../../types';

const mockPerson: Person = {
  id: '1',
  fullName: 'Napoleon Bonaparte',
  firstName: 'Napoleon',
  lastName: 'Bonaparte',
  title: 'Emperor',
  birthDate: '1769-08-15',
  deathDate: '1821-05-05',
  description: 'French military and political leader who rose to prominence during the French Revolution.',
  events: [
    { id: 'e1', title: 'Battle of Waterloo' },
    { id: 'e2', title: 'Coronation' },
  ],
  documents: [
    { id: 'd1', filePath: 'napoleon.md', fileName: 'napoleon.md' },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('PersonCard', () => {
  it('should render person full name', () => {
    render(<PersonCard person={mockPerson} />);

    expect(screen.getByText('Napoleon Bonaparte')).toBeInTheDocument();
  });

  it('should render person title when provided', () => {
    render(<PersonCard person={mockPerson} />);

    expect(screen.getByText('Emperor')).toBeInTheDocument();
  });

  it('should render lifespan when birth and death dates provided', () => {
    render(<PersonCard person={mockPerson} />);

    // Look for dates in the rendered output
    expect(screen.getByText(/1769/)).toBeInTheDocument();
    expect(screen.getByText(/1821/)).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<PersonCard person={mockPerson} />);

    expect(
      screen.getByText(/French military and political leader/),
    ).toBeInTheDocument();
  });

  it('should render events count when person has events', () => {
    render(<PersonCard person={mockPerson} />);

    expect(screen.getByText('2 events')).toBeInTheDocument();
  });

  it('should render documents count when person has documents', () => {
    render(<PersonCard person={mockPerson} />);

    expect(screen.getByText('1 docs')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<PersonCard person={mockPerson} onClick={onClick} />);

    await user.click(screen.getByRole('article'));

    expect(onClick).toHaveBeenCalled();
  });

  it('should render without crashing when optional fields are missing', () => {
    const minimalPerson: Person = {
      id: '2',
      fullName: 'Unknown Person',
      events: [],
      documents: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    render(<PersonCard person={minimalPerson} />);

    expect(screen.getByText('Unknown Person')).toBeInTheDocument();
  });
});
