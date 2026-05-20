export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change_me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  },
});
