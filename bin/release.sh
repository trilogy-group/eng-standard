#!/bin/bash
set -e

# create build
git branch -c update-eng-standards-template staging
git switch staging
npm ci
npm run build

# commit and tag package files
git add -f dist/index.js
git commit -m Release

# replace the tag
git tag -d dummy || true
git push --delete origin dummy || true
git tag dummy
git push --tags origin dummy

# restore
git switch update-eng-standards-template
git branch -D staging
