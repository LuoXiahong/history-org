import { ICommand } from '@nestjs/cqrs';

export class CreatePersonCommand implements ICommand {
  constructor(
    public readonly fullName: string,
    public readonly firstName?: string,
    public readonly lastName?: string,
    public readonly title?: string,
    public readonly birthDate?: Date,
    public readonly deathDate?: Date,
    public readonly description?: string,
  ) {}
}
