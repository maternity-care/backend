export class SepayCallbackDto {
  success: boolean;
  message: string;
  data?: Record<string, unknown> | null;
}
