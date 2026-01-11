export class ExtractEntitiesCommand {
  constructor(
    public readonly documentId: string,
    public readonly content: string,
  ) {}
}
