import { BadRequestException } from '@nestjs/common';

export function parseFutureDateOrNull(value: string | null | undefined, errorMessage: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
    throw new BadRequestException(errorMessage);
  }
  return parsed;
}
