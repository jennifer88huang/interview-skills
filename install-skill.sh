#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  bash install-skill.sh <git-url>

Example:
  bash install-skill.sh https://github.com/jennifer88huang/interview-skills.git

Environment:
  OPENCLAW_SKILLS_DIR  Override the install directory. Default: ~/.openclaw/skills
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

repo_url="${1:-}"
if [[ -z "$repo_url" ]]; then
  usage >&2
  exit 2
fi

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is required but was not found in PATH." >&2
  exit 1
fi

repo_name="$(basename "$repo_url")"
repo_name="${repo_name%.git}"

if [[ -z "$repo_name" || "$repo_name" == "." || "$repo_name" == "/" ]]; then
  echo "Error: could not derive a skill name from: $repo_url" >&2
  exit 1
fi

skills_dir="${OPENCLAW_SKILLS_DIR:-$HOME/.openclaw/skills}"
target_dir="$skills_dir/$repo_name"

mkdir -p "$skills_dir"

if [[ -d "$target_dir/.git" ]]; then
  echo "Updating existing skill: $target_dir"
  git -C "$target_dir" pull --ff-only
elif [[ -e "$target_dir" ]]; then
  echo "Error: target exists but is not a git checkout: $target_dir" >&2
  exit 1
else
  echo "Installing skill from $repo_url"
  git clone "$repo_url" "$target_dir"
fi

if [[ ! -f "$target_dir/SKILL.md" ]]; then
  echo "Error: installed repository does not contain SKILL.md at its root: $target_dir" >&2
  exit 1
fi

echo "Installed to: $target_dir"

if command -v openclaw >/dev/null 2>&1; then
  echo "Verifying with OpenClaw:"
  openclaw skills info "$repo_name" || {
    echo "Warning: OpenClaw did not find '$repo_name'. Restart OpenClaw and run: openclaw skills info $repo_name" >&2
  }
else
  echo "OpenClaw CLI was not found. After installing OpenClaw, verify with: openclaw skills info $repo_name"
fi
