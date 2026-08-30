#!/bin/bash

# So proud of that ;D

wezterm start --cwd . -- bash -c "cd api; bun dev; exec bash" &> /dev/null & disown
wezterm start --cwd . -- bash -c "cd playground; bun dev; exec bash" &> /dev/null & disown
wezterm start --cwd . -- bash -c "cd engine/workers/chat-parser; npx wrangler types & npx wrangler dev --port 8787; exec bash" &> /dev/null & disown
wezterm start --cwd . -- bash -c "cd engine/workers/entity-merger; npx wrangler types & npx wrangler dev --port 8788 --inspector-port 9230; exec bash" &> /dev/null & disown


