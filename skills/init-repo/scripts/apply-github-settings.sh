#!/usr/bin/env bash
# Applies the repository settings that live on GitHub rather than in files:
#   - labels: narrative-required (and no-build-check for a .NET stack)
#   - Actions workflow permissions (Project Narrative opens proposal PRs)
#   - branch protection on the default branch: PR required, one code-owner approval,
#     `ai-fingerprint` required, admins NOT enforced (owner override), no force-push/deletion
#
# Usage: apply-github-settings.sh --repo <owner/name> [--branch main] [--stack dotnet|none] [--dry-run]
#
# The branch must already exist on the remote. This changes shared state, so run it only after the
# user has agreed to it.
set -euo pipefail

repo=""; branch="main"; stack="dotnet"; dry=0
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) repo="${2:?--repo needs a value}"; shift 2 ;;
    --branch) branch="${2:?--branch needs a value}"; shift 2 ;;
    --stack) stack="${2:?--stack needs a value}"; shift 2 ;;
    --dry-run) dry=1; shift ;;
    *) echo "apply-github-settings: unknown option $1" >&2; exit 1 ;;
  esac
done
[ -n "$repo" ] || { echo "apply-github-settings: --repo is required" >&2; exit 1; }

do_gh() {
  echo "  gh $*"
  if [ "$dry" -eq 0 ]; then gh "$@"; fi
}

echo "Labels"
do_gh label create narrative-required -R "$repo" --force \
  --description "Decision-bearing PR: captured by Project Narrative on merge" --color 5319e7
if [ "$stack" = "dotnet" ]; then
  do_gh label create no-build-check -R "$repo" --force \
    --description "Skip the build/test job for a PR that touches build paths but needs no build" --color cfd3d7
fi

echo "Actions workflow permissions"
do_gh api -X PUT "repos/$repo/actions/permissions/workflow" \
  -f default_workflow_permissions=write -F can_approve_pull_request_reviews=true

echo "Branch protection on $branch"
protection=$(cat <<'JSON'
{
  "required_status_checks": {"strict": false, "contexts": ["ai-fingerprint"]},
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_code_owner_reviews": true,
    "dismiss_stale_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
)
echo "  gh api -X PUT repos/$repo/branches/$branch/protection --input - <<< (protection JSON)"
if [ "$dry" -eq 0 ]; then
  printf '%s' "$protection" | gh api -X PUT "repos/$repo/branches/$branch/protection" --input - \
    --jq '{checks: .required_status_checks.checks, enforce_admins: .enforce_admins.enabled, codeowners: .required_pull_request_reviews.require_code_owner_reviews}'
fi
echo "Done."
