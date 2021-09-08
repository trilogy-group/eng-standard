#!/bin/bash
set -e
if [ -z "${GITHUB_TOKEN}" ]; then
  echo -e "\e[31mPlease set the environment variable GITHUB_TOKEN at https://trilogy.devspaces.com/variables\e[0m\nLearn more at https://github.com/trilogy-group/eng-base-ts/blob/main/doc/github-packages.md"
  exit 1
fi
