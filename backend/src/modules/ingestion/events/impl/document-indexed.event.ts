export class DocumentIndexedEvent {
  constructor(
    public readonly documentId: string,
    public readonly filePath: string,
  ) {}
}
