export default () => ({
  mail: {
    enabled: process.env.MAIL_ENABLED === 'true',
    host: process.env.MAIL_HOST ?? '',
    port: Number(process.env.MAIL_PORT ?? 587),
    secure: process.env.MAIL_SECURE === 'true',
    username: process.env.MAIL_USERNAME ?? '',
    password: process.env.MAIL_PASSWORD ?? '',
    fromName: process.env.MAIL_FROM_NAME ?? process.env.APP_NAME ?? 'Maternity Care',
    fromAddress: process.env.MAIL_FROM_ADDRESS ?? 'no-reply@example.com',
  },
});
