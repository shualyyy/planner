#!/bin/bash
cd "$(dirname "$0")"
rm -f .git/index.lock
git add -A
git commit -m "design: apply new design system tokens, fix light mode colors, FAB position"
git push
