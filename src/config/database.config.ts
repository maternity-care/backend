export default () => ({
  database: {
    host: process.env.DB_HOST ?? 'maternity-mariadb',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? 'password',
    name: process.env.DB_DATABASE ?? 'maternity_care',
  },
});
