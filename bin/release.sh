#!/bin/bash
set -e
git tag -d latest || true
git push --delete origin latest || true
git branch -c main staging
git switch staging
npm run build
git add -f dist/index.js
git add -f template
git commit -m Release
git tag latest
git push --tags origin latest
git switch main
git branch -D staging
