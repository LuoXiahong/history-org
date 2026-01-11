import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventCard } from '../EventCard';
import type { HistoricalEvent } from '../../types';

const mockEvent: HistoricalEvent = {
  id: '1',
  title: 'Battle of Waterloo',
  description: 'The final defeat of Napoleon Bonaparte, ending his rule as Emperor.',
  dateStart: '1815-06-18',
  dateEnd: '1815-06-18',
  dateType: 'exact',
  location: 'Waterloo, Belgium',
  document: {
    id: 'd1',
    filePath: 'napoleon.md',
    fileName: 'napoleon.md',
  },
  persons: [
    { id: 'p1', fullName: 'Napoleon Bonaparte', role: 'Commander' },
    { id: 'p2', fullName: 'Duke of Wellington', role: 'Commander' },
  ],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('EventCard', () => {
  it('should render event title', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Battle of Waterloo')).toBeInTheDocument();
  });

  it('should render event date when provided', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText(/Jun 18, 1815/)).toBeInTheDocument();
  });

  it('should render location when provided', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Waterloo, Belgium')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(<EventCard event={mockEvent} />);

    expect(
      screen.getByText(/The final defeat of Napoleon Bonaparte/),
    ).toBeInTheDocument();
  });

  it('should render related persons when provided', () => {
    render(<EventCard event={mockEvent} />);

    // Use getAllByText since person names might appear in multiple elements
    const napoleonElements = screen.getAllByText(/Napoleon Bonaparte/);
    expect(napoleonElements.length).toBeGreaterThan(0);

    const wellingtonElements = screen.getAllByText(/Duke of Wellington/);
    expect(wellingtonElements.length).toBeGreaterThan(0);
  });

  it('should render person roles when provided', () => {
    render(<EventCard event={mockEvent} />);

    const personLabels = screen.getAllByText(/Commander/);
    expect(personLabels).toHaveLength(2);
  });

  it('should call onClick when card is clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<EventCard event={mockEvent} onClick={onClick} />);

    await user.click(screen.getByRole('article'));

    expect(onClick).toHaveBeenCalled();
  });

  it('should handle date range display', () => {
    const rangeEvent: HistoricalEvent = {
      ...mockEvent,
      dateStart: '1815-06-16',
      dateEnd: '1815-06-18',
    };

    render(<EventCard event={rangeEvent} />);

    expect(screen.getByText(/Jun 16, 1815/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 18, 1815/)).toBeInTheDocument();
  });

  it('should render without crashing when optional fields are missing', () => {
    const minimalEvent: HistoricalEvent = {
      id: '2',
      title: 'Unknown Event',
      document: {
        id: 'd2',
        filePath: 'doc.md',
        fileName: 'doc.md',
      },
      persons: [],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    render(<EventCard event={minimalEvent} />);

    expect(screen.getByText('Unknown Event')).toBeInTheDocument();
  });

  it('should show +N more when more than 3 persons', () => {
    const manyPersonsEvent: HistoricalEvent = {
      ...mockEvent,
      persons: [
        { id: 'p1', fullName: 'Person 1' },
        { id: 'p2', fullName: 'Person 2' },
        { id: 'p3', fullName: 'Person 3' },
        { id: 'p4', fullName: 'Person 4' },
        { id: 'p5', fullName: 'Person 5' },
      ],
    };

    render(<EventCard event={manyPersonsEvent} />);

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});
