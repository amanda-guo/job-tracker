#!/bin/bash
INPUT=$(cat)

# Loop guard: if we already sent the agent back once, let it stop.
# Without this, a check it can't fix would keep it working forever.
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active')" = "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

# Skip the check if no files were changed (e.g. you only asked a question).
if git diff --quiet HEAD && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  exit 0
fi

if ! OUTPUT=$(npm run check 2>&1); then
  echo "npm run check is failing. Fix it before finishing:" >&2
  echo "$OUTPUT" | tail -40 >&2
  exit 2   # 2 = don't stop yet; keep working
fi

exit 0