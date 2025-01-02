import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsPasswordValidConstraint implements ValidatorConstraintInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validate(password: string, args: ValidationArguments) {
    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  defaultMessage(args: ValidationArguments) {
    return 'Пароль должен содержать минимум 8 символов, одну букву, одну цифру и один специальный символ';
  }
}

// Создаем декоратор
export function IsPasswordValid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPasswordValidConstraint,
    });
  };
}
