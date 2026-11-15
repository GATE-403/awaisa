#!/usr/bin/env bash
# Runs a scenario with the official k6 image (no install): ./k6.sh browse.js [-e PEAK=300 …]
# Results land in results/ (git-ignored). The stand must be up (./stand.sh up [web]).
set -euo pipefail
cd "$(dirname "$0")"
SCRIPT=$1; shift
mkdir -p results
exec docker run --rm -v "$PWD":/scripts -e K6_NO_USAGE_REPORT=true grafana/k6:2.4.0 run --quiet "$@" "/scripts/$SCRIPT"
