import { ICommand } from '@nestjs/cqrs';

export class DeletePersonCommand implements ICommand {
  constructor(public readonly personId: string) {}
}
