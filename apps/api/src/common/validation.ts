import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import type { FieldError } from '@ims/shared';

function flatten(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((e) => {
    const field = parent ? `${parent}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(e.children ?? [], field)];
  });
}

export function validationFailed(details: FieldError[]): BadRequestException {
  return new BadRequestException({ message: 'Validation failed', details });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => validationFailed(flatten(errors)),
  });
}
