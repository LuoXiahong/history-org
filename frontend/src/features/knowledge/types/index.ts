export interface PersonEvent {
  id: string;
  title: string;
  dateStart?: string;
  role?: string;
  context?: string;
}

export interface PersonDocument {
  id: string;
  filePath: string;
  fileName: string;
  context?: string;
}

export interface Person {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  birthDate?: string;
  deathDate?: string;
  description?: string;
  events: PersonEvent[];
  documents: PersonDocument[];
  createdAt: string;
  updatedAt: string;
}

export interface EventPerson {
  id: string;
  fullName: string;
  role?: string;
  context?: string;
}

export interface EventDocument {
  id: string;
  filePath: string;
  fileName: string;
  title?: string;
}

export interface HistoricalEvent {
  id: string;
  title: string;
  description?: string;
  dateStart?: string;
  dateEnd?: string;
  dateType?: string;
  location?: string;
  document: EventDocument;
  persons: EventPerson[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  persons: Person[];
  events: HistoricalEvent[];
  totalPersons: number;
  totalEvents: number;
}
