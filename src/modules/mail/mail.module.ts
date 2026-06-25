import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MAIL_SERVICE } from './interfaces/mail-service.interface';

@Module({
  providers: [
    MailService,
    {
      provide: MAIL_SERVICE,
      useExisting: MailService,
    },
  ],
  exports: [MAIL_SERVICE],
})
export class MailModule {}
