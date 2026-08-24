#!/usr/bin/env bash
# Runs the flaky repro test N times (default 20) and reports a pass/fail tally.
# Usage: ./run-repro.sh [N]

set -euo pipefail

RUNS="${1:-20}"
LOG_DIR="$(mktemp -d)"
PASS=0
FAIL=0

echo "Running $RUNS iterations, logs in $LOG_DIR"

for i in $(seq 1 "$RUNS"); do
  LOG_FILE="$LOG_DIR/run-$i.log"
  if npx jest repro.test.js > "$LOG_FILE" 2>&1; then
    PASS=$((PASS + 1))
    STATUS="PASS"
  else
    FAIL=$((FAIL + 1))
    STATUS="FAIL"
  fi
  echo "run $i: $STATUS"
done

echo
echo "== Summary =="
echo "passed: $PASS / $RUNS"
echo "failed: $FAIL / $RUNS"

if [ "$FAIL" -gt 0 ]; then
  echo
  echo "Failing run logs:"
  for i in $(seq 1 "$RUNS"); do
    LOG_FILE="$LOG_DIR/run-$i.log"
    if ! grep -q "Tests:.*passed" "$LOG_FILE"; then
      echo "  $LOG_FILE"
    fi
  done
fi
