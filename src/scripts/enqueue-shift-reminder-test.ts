import 'dotenv/config';
import { Queue } from 'bullmq';
import {
  CHECK_NEXT_WEEK_SHIFTS_JOB,
  SHIFT_REMINDERS_QUEUE,
} from '../modules/shift-reminders/shift-reminders.constants';

async function main() {
  const runAtValue = process.argv[2];
  const runAt = runAtValue ? new Date(runAtValue) : null;
  if (!runAt || Number.isNaN(runAt.getTime()) || runAt.getTime() <= Date.now()) {
    throw new Error('Truyền thời điểm tương lai theo ISO, ví dụ 2026-08-14T21:20:00+07:00.');
  }

  const queue = new Queue(SHIFT_REMINDERS_QUEUE, {
    connection: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
    },
  });

  try {
    const delay = runAt.getTime() - Date.now();
    const job = await queue.add(
      CHECK_NEXT_WEEK_SHIFTS_JOB,
      { source: 'manual-schedule-test', runAt: runAt.toISOString() },
      {
        jobId: `manual-shift-reminder-${runAt.getTime()}`,
        delay,
        removeOnComplete: 20,
        removeOnFail: 100,
      },
    );
    console.log(`Đã hẹn job ${job.id} chạy lúc ${runAt.toISOString()}, còn ${Math.ceil(delay / 1000)} giây.`);
  } finally {
    await queue.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
