#!/bin/bash
set -e
branch=(git branch --show-current)
git switch latest
git merge --ff-only main
npm run build
git add -f dist/index.js
git commit -m Release
git push
git switch $branch
