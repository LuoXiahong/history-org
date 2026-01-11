import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Calendar, Search as SearchIcon, Inbox } from 'lucide-react';
import { SearchInput } from '../components/SearchInput';
import { PersonCard } from '../components/PersonCard';
import { EventCard } from '../components/EventCard';
import { searchKnowledge } from '../api/knowledge.api';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['knowledge-search', debouncedQuery],
    queryFn: () => searchKnowledge({ q: debouncedQuery }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  const showResults = debouncedQuery.length >= 2;
  const hasResults =
    data && (data.persons.length > 0 || data.events.length > 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Search Knowledge</h1>
        <p className="mt-2 text-gray-600">
          Search across extracted persons and events from your documents.
        </p>
      </div>

      <div className="mb-8">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          isLoading={isLoading && showResults}
          autoFocus
        />
        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="mt-2 text-sm text-gray-500">
            Type at least 2 characters to search
          </p>
        )}
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800">
            {error instanceof Error
              ? error.message
              : 'An error occurred while searching'}
          </p>
        </div>
      )}

      {showResults && !isLoading && !hasResults && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No results found
          </h3>
          <p className="text-gray-500">
            Try a different search term or upload more documents.
          </p>
        </div>
      )}

      {!showResults && !isError && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <SearchIcon className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Start searching
          </h3>
          <p className="text-gray-500">
            Search for historical persons, events, or places
          </p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-10">
          {data.persons.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Persons
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({data.totalPersons} found)
                  </span>
                </h2>
              </div>
              <div className="grid gap-4">
                {data.persons.map((person) => (
                  <PersonCard key={person.id} person={person} />
                ))}
              </div>
            </section>
          )}

          {data.events.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Events
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({data.totalEvents} found)
                  </span>
                </h2>
              </div>
              <div className="grid gap-4">
                {data.events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
