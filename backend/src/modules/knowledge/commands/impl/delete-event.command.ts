import { ICommand } from '@nestjs/cqrs';

export class DeleteEventCommand implements ICommand {
  constructor(public readonly eventId: string) {}
}
