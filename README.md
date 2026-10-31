# Adams Productivity Hub

A personal productivity dashboard built on Hatchable.

## Features

- Weekly timetable and activity tracking
- Projects, tasks, priorities, due dates, and subtasks
- Learning and reading trackers
- Weekly goals and reviews
- Personal progress dashboard and JSON data export

## Project structure

- `api/data.js` — authenticated, user-scoped data API using the Hatchable database SDK
- `pages/index.js` — application page entry point
- `public/` — browser application, styles, and login page
- `migrations/` — database schema migrations
- `hatchable.toml` — Hatchable authentication and per-user table access configuration

## Runtime

This project currently targets the Hatchable runtime. The backend imports `db` from the `hatchable` package and relies on Hatchable-managed authentication, database access, and deployment configuration. It is not a standalone Node.js application yet.

To run or deploy it, use the Hatchable project environment and its supported deployment workflow. A local VS Code checkout is suitable for editing, reviewing, and version-controlling the source. Do not expose environment credentials or user database records in this repository.

## Local development

```bash
git clone https://github.com/Aftermath001/Adams-Productivity.git
cd Adams-Productivity
code .
```

Changes made locally can be committed and pushed to GitHub. They will not automatically update the live Hatchable app unless a deployment or synchronization workflow is configured.
