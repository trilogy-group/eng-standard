#!/bin/bash

# init the container, the output is shared by all users

set -e
bin/gitpod-check.sh
npm ci

