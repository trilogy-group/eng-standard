#!/bin/bash
set -e
branch=$(git branch --show-current)
git branch -D latest || true
git branch -c main latest
git switch latest
npm run build
git add -f dist/index.js
git commit -m Release
git push -f origin latest
git switch $branch
