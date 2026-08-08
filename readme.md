# MemoryEngine
Ai memory engine allows to persist knowledge which ai gains through multiple sessions and days



## How to run
In `/api` folder run:
- `bun install`
- `bun dev`
In `/playground/openmem-playground` folder run:
- `bun install`
- `bun dev`
In `workers/engine` folder run:
~~ Working on it gimme some time ()_() ~~

## Tech stack
- Ts, Py, Sql
- React, Hono, Postgres, Cloudflare

# How it works
## General
You chat with ai and conversation from this chat is being parsed inside server which performs `NER` on messages and
tries to understand relationships between them. Later engine inserts extracted data into database which can be queried via `recaller`
### Backend
#### API
Simple endpoints allowing user to create sessions, containers and send messages to parse

#### ENGINE
Multi stage extraction platform. Runs on cloudflare queue for efficiency and performs all stages of memory extraction:
- Memory extraction
- `NER` alongside `relationship extraction`
- `Insert to database`
- Cron job: `Indirect merger` (merges entities that might not be the same parameterwise but are the same in meaning)

