#!/usr/bin/env bash
# Run the Ollama drafting jobs in sequence (one model in GPU memory at a time).
# Each job gets PLAN.md as context plus a prompt from scripts/prompts/.
# Drafts land under docs/ and docs/drafts/; the owning agent reviews before anything is final.
set -u
cd "$(dirname "$0")/.."
mkdir -p docs docs/drafts
run() {  # run MODEL PROMPT OUT
  local model=$1 prompt=$2 out=$3
  echo "== $(date +%H:%M:%S) $prompt -> $out ($model)"
  { cat PLAN.md; printf '\n\n---\n\n'; cat "scripts/prompts/$prompt"; } \
    | node scripts/ollama.mjs --model "$model" --out "$out" - \
    || echo "!! $prompt failed"
}
run qwen3.5:9b decisions.txt    docs/decisions.md
run qwen3.5:9b readme.txt       docs/drafts/README-draft.md
run qwen3.5:9b submission.txt   docs/drafts/submission.md
run qwen3.5:9b user-flow.txt    docs/user-flow.md
run coder16k   architecture.txt docs/architecture.md
run coder16k   data-model.txt   docs/data-model.md
echo "== done $(date +%H:%M:%S)"
