import { BadRequestException, Body, PipeTransform } from '@nestjs/common';
import { z, ZodTypeAny } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodTypeAny) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.flatten(),
      });
    }
    return result.data;
  }
}

export const ZodBody = <T extends ZodTypeAny>(schema: T): ParameterDecorator =>
  Body(new ZodValidationPipe(schema));

export type Infer<T extends ZodTypeAny> = z.infer<T>;
