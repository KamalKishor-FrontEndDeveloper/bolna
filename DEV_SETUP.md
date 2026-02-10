Dev Setup & Tasks

1. Install dependencies:

   npm install

2. Create / configure a Postgres database and set `DATABASE_URL` in `.env`.

3. Apply the initial schema (using drizzle-kit):

   npm run db:push

   OR run the SQL migration directly (there is a `drizzle/migrations/0001_init.sql` file).

4. Seed the DB with a test API key, user and agent:

   npm run db:seed

5. Run tests:

   npm test

6. Start development server:

   npm run dev

Admin user creation (local dev)

- Open `/admin-users` in the app and sign in as a super-admin to create users for tenants using the UI (super-admin credentials are required).

Create a Super Admin (secure)

- To avoid seeding static credentials, use the provided script to create or update a super admin with a secure password:

  1. Set env vars: `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and optionally `SUPER_ADMIN_NAME`.
  2. Run: `node ./script/create_super_admin.ts` (or `ts-node ./script/create_super_admin.ts`).

- This ensures the super admin is stored in the database with a bcrypt-hashed password instead of relying on static seeded credentials.
