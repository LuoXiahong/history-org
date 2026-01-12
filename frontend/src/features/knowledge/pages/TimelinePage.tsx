import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Filter, X, AlertCircle } from 'lucide-react';
import { getTimeline } from '../api/knowledge.api';
import { TimelineList } from '../components/Timeline/TimelineList';
import type { TimelineEvent } from '../types';

function TimelinePage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['timeline', startDate, endDate],
    queryFn: () =>
      getTimeline({
        dateStart: startDate || undefined,
        dateEnd: endDate || undefined,
        limit: 100,
      }),
    staleTime: 30 * 1000,
  });

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const hasFilters = startDate || endDate;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Timeline</h1>
        <p className="text-gray-600">
          View historical events chronologically from your documents.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Date Filters</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Calendar className="w-8 h-8 text-indigo-500" />
          </div>
          <p className="text-gray-600">Loading timeline events...</p>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-800 mb-4">
            {error instanceof Error
              ? error.message
              : 'An error occurred while loading the timeline'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && data && (
        <TimelineList
          events={data}
          onEventClick={(event: TimelineEvent) => {
            console.log('Event clicked:', event.id);
          }}
        />
      )}
    </div>
  );
}

export default TimelinePage;
export { TimelinePage };
