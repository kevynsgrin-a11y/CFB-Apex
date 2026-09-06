# Local setup

Requirements: Node.js 22.13+ and npm.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:3000`. The default is deterministic fixture mode. Do not add real credentials to tracked files.

Run `npm.cmd run verify` before handoff. The preview declares no D1 database; `db:migrate` confirms that migration state and `db:seed` validates the fixture pack.
