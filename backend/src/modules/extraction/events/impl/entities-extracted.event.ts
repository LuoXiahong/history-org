export class EntitiesExtractedEvent {
  constructor(
    public readonly documentId: string,
    public readonly personCount: number,
    public readonly eventCount: number,
  ) {}
}
