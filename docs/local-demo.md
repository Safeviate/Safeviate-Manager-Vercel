# Local demo database

Safeviate uses PostgreSQL. The repository includes a disposable local PostgreSQL 16 container so local demonstrations do not need to connect to Azure.

## First-time setup

1. Install and start Docker Desktop.
2. Copy `.env.local.example` to `.env.local`.
3. Run:

```powershell
npm.cmd run local:setup
npm.cmd run dev
```

The setup command starts PostgreSQL on port `5433` and applies the Prisma schema. In development, the configured seed login is:

`barry@safeviate.com` / `SafeviateTemp2026!`

The local database starts empty by design. Use the Development/Simulation Lab or create demo records through the application. Live tenant data is never copied automatically.

## Daily commands

```powershell
npm.cmd run local:db:up
npm.cmd run local:db:down
npm.cmd run prisma:studio
```

To discard the local database and recreate it from the schema:

```powershell
npm.cmd run local:db:reset
npm.cmd run local:setup
```

`local:db:reset` removes the Docker volume and is intentionally destructive to local demo data only.
