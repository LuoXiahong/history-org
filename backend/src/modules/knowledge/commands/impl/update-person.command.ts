import { ICommand } from '@nestjs/cqrs';

export class UpdatePersonCommand implements ICommand {
  constructor(
    public readonly personId: string,
    public readonly fullName?: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly title?: string,
    public readonly birthDate?: Date,
    public readonly deathDate?: Date,
    public readonly description?: string,
  ) {}
}
