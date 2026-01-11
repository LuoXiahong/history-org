import { apiClient } from '../../../lib/axios';
import type { Person, HistoricalEvent, SearchResult, TimelineEvent } from '../types';

export interface SearchParams {
  q: string;
  limit?: number;
  offset?: number;
}

export interface TimelineParams {
  dateStart?: string;
  dateEnd?: string;
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

export async function getTimeline(params: TimelineParams): Promise<TimelineEvent[]> {
  const response = await apiClient.get<TimelineEvent[]>('/knowledge/timeline', {
    params: {
      dateStart: params.dateStart,
      dateEnd: params.dateEnd,
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
    },
  });

  return response.data;
}

export interface CreatePersonDto {
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: string;
  deathDate?: string;
  description?: string;
}

export interface UpdatePersonDto {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: string;
  deathDate?: string;
  description?: string;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  dateStart?: string;
  dateEnd?: string;
  dateType?: string;
  location?: string;
  documentId?: string;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  dateStart?: string;
  dateEnd?: string;
  dateType?: string;
  location?: string;
  documentId?: string;
}

export interface EnrichedPersonData {
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: string;
  deathDate?: string;
  description?: string;
}

export async function createPerson(dto: CreatePersonDto): Promise<Person> {
  const response = await apiClient.post<Person>('/knowledge/persons', dto);
  return response.data;
}

export async function updatePerson(id: string, dto: UpdatePersonDto): Promise<Person> {
  const response = await apiClient.put<Person>(`/knowledge/persons/${id}`, dto);
  return response.data;
}

export async function deletePerson(id: string): Promise<void> {
  await apiClient.delete(`/knowledge/persons/${id}`);
}

export async function enrichPerson(name: string): Promise<EnrichedPersonData> {
  const response = await apiClient.post<EnrichedPersonData>('/knowledge/enrich-person', { name });
  return response.data;
}

export async function createEvent(dto: CreateEventDto): Promise<HistoricalEvent> {
  const response = await apiClient.post<HistoricalEvent>('/knowledge/events', dto);
  return response.data;
}

export async function updateEvent(id: string, dto: UpdateEventDto): Promise<HistoricalEvent> {
  const response = await apiClient.put<HistoricalEvent>(`/knowledge/events/${id}`, dto);
  return response.data;
}

export async function deleteEvent(id: string): Promise<void> {
  await apiClient.delete(`/knowledge/events/${id}`);
}
