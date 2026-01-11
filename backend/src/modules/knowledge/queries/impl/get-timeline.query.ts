export class GetTimelineQuery {
  constructor(
    public readonly dateStart?: Date,
    public readonly dateEnd?: Date,
    public readonly limit: number = 50,
    public readonly offset: number = 0,
  ) {}
}
