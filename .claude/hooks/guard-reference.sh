#!/bin/bash
# Runs before every Edit or Write. Claude Code sends details of the
# edit as JSON; we pull out the file path being changed.
FILE=$(jq -r '.tool_input.file_path // empty')

case "$FILE" in
  */reference/*)
    echo "Blocked: reference/ is read-only. It's the blueprint from the old app. Read it, but make changes in src/." >&2
    exit 2   # 2 = block the edit and show this message to the agent
    ;;
esac

exit 0       # 0 = no objection, carry on