import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EXAMPLE_QUEUE, JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { ExampleProcessor } from './processors/example.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: EXAMPLE_QUEUE,
    }),
  ],
  controllers: [JobsController],
  providers: [JobsService, ExampleProcessor],
})
export class JobsModule {}
