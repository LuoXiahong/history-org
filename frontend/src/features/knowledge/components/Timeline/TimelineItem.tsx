import { Calendar, MapPin, Users, FileText } from 'lucide-react';
import type { TimelineEvent } from '../../types';

interface TimelineItemProps {
  event: TimelineEvent;
  onClick?: () => void;
}

function formatEventDate(event: TimelineEvent): string | null {
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

export function TimelineItem({ event, onClick }: TimelineItemProps) {
  const dateDisplay = formatEventDate(event);

  return (
    <article
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200 p-5 mb-6
        shadow-sm hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-indigo-400' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
            {event.title}
          </h3>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            {dateDisplay && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
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
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-3">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100">
            {event.persons.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <div className="flex flex-wrap gap-1.5">
                  {event.persons.slice(0, 3).map((person, index) => (
                    <span
                      key={index}
                      className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
                    >
                      {person}
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

            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <FileText className="w-3 h-3" />
              <span>{event.document.fileName}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
