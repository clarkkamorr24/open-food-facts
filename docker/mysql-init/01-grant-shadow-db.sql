-- Prisma Migrate creates a temporary "shadow database" to detect schema drift,
-- which requires privileges beyond the single application schema. This is a
-- local development convenience only; a production user would be scoped to its
-- own schema and migrations deployed with `prisma migrate deploy`.
GRANT ALL PRIVILEGES ON *.* TO 'food'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
