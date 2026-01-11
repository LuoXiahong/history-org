import { Calendar } from 'lucide-react';
import type { TimelineEvent } from '../../types';
import { TimelineItem } from './TimelineItem';

interface TimelineListProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
}

interface GroupedEvents {
  [year: string]: TimelineEvent[];
}

function groupEventsByYear(events: TimelineEvent[]): GroupedEvents {
  const grouped: GroupedEvents = {};

  events.forEach((event) => {
    if (!event.dateStart) {
      const noDateKey = 'Unknown Date';
      if (!grouped[noDateKey]) {
        grouped[noDateKey] = [];
      }
      grouped[noDateKey].push(event);
      return;
    }

    try {
      const date = new Date(event.dateStart);
      const year = date.getFullYear().toString();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(event);
    } catch {
      const noDateKey = 'Unknown Date';
      if (!grouped[noDateKey]) {
        grouped[noDateKey] = [];
      }
      grouped[noDateKey].push(event);
    }
  });

  Object.keys(grouped).forEach((year) => {
    grouped[year].sort((a, b) => {
      if (!a.dateStart) return 1;
      if (!b.dateStart) return -1;
      return new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
    });
  });

  return grouped;
}

function getSortedYears(grouped: GroupedEvents): string[] {
  const years = Object.keys(grouped).filter((year) => year !== 'Unknown Date');
  years.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

  if (grouped['Unknown Date']) {
    years.push('Unknown Date');
  }

  return years;
}

export function TimelineList({ events, onEventClick }: TimelineListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No events found
        </h3>
        <p className="text-gray-500">
          Try adjusting your date filters or upload more documents.
        </p>
      </div>
    );
  }

  const grouped = groupEventsByYear(events);
  const sortedYears = getSortedYears(grouped);

  return (
    <div className="relative">
      {sortedYears.map((year) => (
        <div key={year} className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm"></div>
              <h2 className="text-2xl font-bold text-gray-900">{year}</h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-indigo-200 to-transparent"></div>
            <span className="text-sm text-gray-500">
              {grouped[year].length} {grouped[year].length === 1 ? 'event' : 'events'}
            </span>
          </div>

          <div className="relative pl-8 border-l-2 border-indigo-200">
            {grouped[year].map((event) => (
              <div key={event.id} className="relative">
                <div className="absolute -left-[13px] top-6 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white shadow-sm"></div>
                <TimelineItem
                  event={event}
                  onClick={onEventClick ? () => onEventClick(event) : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
