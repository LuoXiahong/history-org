import { User, Calendar, FileText } from 'lucide-react';
import type { Person } from '../types';

interface PersonCardProps {
  person: Person;
  onClick?: () => void;
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function PersonCard({ person, onClick }: PersonCardProps) {
  const birthDate = formatDate(person.birthDate);
  const deathDate = formatDate(person.deathDate);
  const lifespan =
    birthDate && deathDate
      ? `${birthDate} – ${deathDate}`
      : birthDate
        ? `Born ${birthDate}`
        : deathDate
          ? `Died ${deathDate}`
          : null;

  return (
    <article
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-gray-200 p-5 
        shadow-sm hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-indigo-300' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <User className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                {person.fullName}
              </h3>
              {person.title && (
                <p className="text-sm text-indigo-600 font-medium mt-0.5">
                  {person.title}
                </p>
              )}
            </div>
          </div>

          {lifespan && (
            <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>{lifespan}</span>
            </div>
          )}

          {person.description && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-2">
              {person.description}
            </p>
          )}

          {(person.events.length > 0 || person.documents.length > 0) && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
              {person.events.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{person.events.length} events</span>
                </div>
              )}
              {person.documents.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{person.documents.length} docs</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
