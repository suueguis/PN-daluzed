# Contributing to Daluzed

This guide explains how to contribute to the Daluzed project following strict team workflow rules.

## Quick Start

1. **Sync with main**: `git checkout main && git pull origin main`
2. **Create feature branch**: `git checkout -b feature/your-feature-name`
3. **Make changes and test locally** (see Testing section below)
4. **Commit using `/commit` skill**: Ensures proper conventional format + co-author attribution
5. **Push to remote**: `git push -u origin feature/your-feature-name`
6. **Create PR on GitHub**: Describe your changes, reference issues if applicable
7. **Wait for team lead approval** + GitHub Actions to pass
8. **Merge via GitHub UI** (team lead only)

## Testing Before You Push

**Run locally to catch errors before CI:**

### Backend Tests
```bash
# Run Django tests
python manage.py test

# Check Django configuration
python manage.py check

# (Optional) Run specific test file
python manage.py test apps.authentication.tests
```

### Frontend Checks
```bash
cd frontend

# Install dependencies (first time only)
npm install

# Run linter (catches style issues)
npm run lint

# Verify build succeeds
npm run build
```

**Pro Tip**: Run all checks before pushing:
```bash
# Backend
python manage.py test && python manage.py check

# Frontend
cd frontend && npm run lint && npm run build
```

## Commit Message Format

**Always use the `/commit` skill** — it formats commits correctly.

Examples:
```
feat(auth): add email verification flow
fix(frontend): correct login form validation error
test(api): add user endpoint integration tests
docs(readme): update database setup instructions
```

Format: `<type>(<scope>): <message>`

**Types**: `feat`, `fix`, `test`, `docs`, `refactor`, `style`, `perf`

## Creating Pull Requests

1. **Add a clear title**: Summarize your changes (e.g., "Add JWT refresh token rotation")
2. **Describe what changed**: List key changes and why they matter
3. **Link any issues**: Use `Fixes #123` or `Relates to #123`
4. **Check the checklist**:
   - ✅ Tests pass locally (`python manage.py test` + `npm run lint`)
   - ✅ No secrets in code (passwords, API keys, tokens)
   - ✅ PR title is clear and descriptive
   - ✅ Database migrations are included (if applicable)

## GitHub Actions (CI/CD) Checks

When you push to GitHub, our CI pipeline automatically runs:

### Backend Pipeline
- ✅ PostgreSQL database starts
- ✅ Migrations apply
- ✅ Django tests run
- ✅ System checks pass

### Frontend Pipeline
- ✅ Dependencies install
- ✅ ESLint passes (no style violations)
- ✅ Build succeeds (Vite bundles correctly)

**All checks must pass** before merge is allowed.

**If CI fails**: Click "Details" on the failing check to see error logs. Fix locally, push again, and CI will rerun automatically.

## Branch Protection Rules

The `main` branch is protected to prevent accidental merges:

- ❌ Direct pushes are **blocked**; use PRs only
- ✅ Requires **1 approval** from team lead
- ✅ Requires **all CI checks to pass**
- ✅ All commits are squashed/merged cleanly

## Common Mistakes (And How to Fix Them)

### ❌ "I pushed directly to main"
**Fix**: Push to a feature branch instead. Contact team lead if needed.

### ❌ "Tests failed on CI but passed locally"
**Possible causes**:
- Different database (local vs CI PostgreSQL)
- Environment variables missing
- Node/Python version differences
- Lock file out of sync

**Fix**: 
```bash
# Ensure lock files are in sync
cd frontend && npm install
git add frontend/package-lock.json

# Re-run tests locally
python manage.py test
```

### ❌ "I committed a secret (password, API key)"
**Fix immediately**: 
1. Remove the secret from code
2. Create a new commit removing it
3. Rotate the exposed secret in production
4. Force-push with: `git push --force-with-lease`
5. Notify team lead

### ❌ "ESLint failed on my JavaScript changes"
**Fix**:
```bash
cd frontend
npm run lint --fix  # Auto-fix style issues
git add .
git commit -m "style: fix linting issues"
git push
```

## Getting Help

- **Questions about workflow**: Check `AGENTS.md` (team instructions)
- **Questions about setup**: Check `AGENTS.md` (architecture & commands)
- **Issues with a specific check**: See error logs in GitHub Actions
- **Need to update dependencies**: Ask team lead before changing `package.json` or `requirements.txt`

## Release Process

(To be added when ready for production releases)
