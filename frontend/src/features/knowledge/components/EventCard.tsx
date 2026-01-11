import { Calendar, MapPin, Users } from 'lucide-react';
import type { HistoricalEvent } from '../types';

interface EventCardProps {
  event: HistoricalEvent;
  onClick?: () => void;
}

function formatEventDate(event: HistoricalEvent): string | null {
  if (!event.dateStart) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const startDate = formatDate(event.dateStart);

  if (event.dateEnd && event.dateEnd !== event.dateStart) {
    const endDate = formatDate(event.dateEnd);
    return `${startDate} – ${endDate}`;
  }

  return startDate;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const dateDisplay = formatEventDate(event);

  return (
    <article
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200 p-5
        shadow-sm hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-amber-300' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {event.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            {dateDisplay && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{dateDisplay}</span>
                {event.dateType && event.dateType !== 'exact' && (
                  <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                    {event.dateType}
                  </span>
                )}
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
              {event.description}
            </p>
          )}

          {event.persons.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <Users className="w-4 h-4 text-gray-400" />
              <div className="flex flex-wrap gap-1.5">
                {event.persons.slice(0, 3).map((person) => (
                  <span
                    key={person.id}
                    className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                  >
                    {person.fullName}
                    {person.role && (
                      <span className="text-indigo-400 ml-1">
                        ({person.role})
                      </span>
                    )}
                  </span>
                ))}
                {event.persons.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{event.persons.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
