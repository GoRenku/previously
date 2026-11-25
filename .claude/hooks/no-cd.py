#!/usr/bin/env python3
"""PreToolUse hook (Bash): refuse a command that uses `cd`.

A `cd` moves the session's working directory. File links in the desktop app are then written against the wrong
folder and the user sees "This file is outside this session's folders". It also moves where the content repo's
relative paths land. Use absolute paths instead, `git -C <dir>`, or a tool's own directory option.
"""
import json
import re
import sys

try:
    command = (json.load(sys.stdin).get("tool_input") or {}).get("command", "")
except Exception:
    sys.exit(0)  # never block on a payload we can't read

# `cd` as a command word: at the start, or after ; & | ( or a newline
if re.search(r"(?:^|[;&|(\n])\s*cd(?:\s|$)", command):
    print(
        "Blocked: don't `cd` in this project. It moves the session's working directory, so file links the user "
        "clicks open outside the session's folders. Use absolute paths, `git -C <dir>`, or the tool's own "
        "directory option (e.g. `node <cli> <cmd> <dir>`, `make -C`). Write file links relative to "
        "/Users/keremk/Projects/aitinkerbox/previously (content files: ../previously-content/...).",
        file=sys.stderr,
    )
    sys.exit(2)
sys.exit(0)
