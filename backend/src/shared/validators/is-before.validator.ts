import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Custom validator to check if a date property is before another date property.
 * Used for validating date ranges (e.g., dateStart <= dateEnd).
 *
 * @param property - The name of the property to compare against
 * @param validationOptions - Optional validation options
 */
export function IsBefore(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBefore',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedPropertyName
          ];

          // If either value is missing, let other validators handle it
          if (!value || !relatedValue) {
            return true;
          }

          return new Date(value as string) <= new Date(relatedValue as string);
        },
        defaultMessage(args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          return `${args.property} must be before or equal to ${relatedPropertyName}`;
        },
      },
    });
  };
}
