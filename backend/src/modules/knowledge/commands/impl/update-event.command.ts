import { ICommand } from '@nestjs/cqrs';

export class UpdateEventCommand implements ICommand {
  constructor(
    public readonly eventId: string,
    public readonly title?: string,
    public readonly description?: string,
    public readonly dateStart?: Date,
    public readonly dateEnd?: Date,
    public readonly dateType?: string,
    public readonly location?: string,
    public readonly documentId?: string,
  ) {}
}
