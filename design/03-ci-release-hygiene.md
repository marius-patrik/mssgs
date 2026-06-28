# Design Doc: CI Release Hygiene

## Issue
#24

## Goal
Make CI and release trustworthy and prevent publishing from dirty or mismatched trees.

## Current State
- `engines.vscode` is `^1.90.0` but runtime requires Node 22.
- Stale `packages/extension/package-lock.json` exists with removed deps.
- Release workflow has no dirty-tree or tag-version guards.

## Proposed Change
1. Pin `engines.vscode` to the actual minimum after foundation changes.
2. Delete stale lockfiles.
3. Add `git status --porcelain` check in release workflow.
4. Assert `github.ref_name == v${version}` before publish.
5. Ensure CI runs lint/typecheck/test/build/package on release-prep/base.

## Acceptance Criteria
- CI green.
- Release workflow rejects dirty/mismatched tags.
