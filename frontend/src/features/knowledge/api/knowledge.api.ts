import { apiClient } from '../../../lib/axios';
import type { Person, HistoricalEvent, SearchResult } from '../types';

export interface SearchParams {
  q: string;
  limit?: number;
  offset?: number;
}

export async function searchKnowledge(params: SearchParams): Promise<SearchResult> {
  const response = await apiClient.get<SearchResult>('/knowledge/search', {
    params: {
      q: params.q,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    },
  });

  return response.data;
}

export async function getPerson(id: string): Promise<Person> {
  const response = await apiClient.get<Person>(`/knowledge/persons/${id}`);
  return response.data;
}

export async function getEvent(id: string): Promise<HistoricalEvent> {
  const response = await apiClient.get<HistoricalEvent>(`/knowledge/events/${id}`);
  return response.data;
}
