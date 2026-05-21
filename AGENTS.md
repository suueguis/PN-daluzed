# CLAUDE.md

This file provides comprehensive guidance for working on this repository. It works with:
- ✅ **Claude Code CLI** (`claude` command)
- ✅ **Cursor** (with Claude or any model)
- ✅ **Zed** (with Claude or any model)
- ✅ **Antigravity** (with Claude or any model)
- ✅ **Any AI editor** (Claude, GPT-4, Sonnet, any LLM)
- ✅ **Manual human work** (follow the instructions directly)

All instructions work for any AI model or editor. When you see `/validate-pr` (Claude Code skill), manual command alternatives are provided for other editors.

---

## Project Overview

**Daluzed** — Full-stack inventory management for bakeries (panadería).
- **Backend**: Django REST Framework with JWT authentication
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL (daluzed_db)
- **Team**: 2 developers, feature-branch workflow, all changes require PR + 1 approval

---

## Architecture

### Backend Structure (Django)
- **core/**: Project configuration (settings, URLs, WSGI)
- **apps/authentication/**: Custom User model, JWT auth, Axes brute-force protection
  - `models.py`: Email-based User with roles (ADMIN, GERENTE, PRODUCCION, INVENTARIO)
  - `tests.py`: 21+ unit tests for models, views, services
  - `api/v1/`: REST endpoints (login, logout, token refresh)
  - `services.py`: Token generation logic

### Frontend Structure (React + Vite)
- **src/pages/**: Page components (Login, etc.)
- **src/store/**: Zustand store (authStore.js - token and user management)
- **src/api/**: HTTP client (axiosClient.js with token interceptors, authAPI.js)
- **vitest.config.js**: Test configuration
- **src/**/*.test.js**: 11+ frontend tests (store, API client)

---

## Key Technologies & Configuration

### Backend
- Django + DRF + djangorestframework-simplejwt (JWT)
- Access token: 30 minutes; Refresh token: 7 days
- PostgreSQL database (daluzed_db, postgres:1234@localhost:5432)
- Axes middleware: 5 failed login attempts = 1-hour lockout
- CORS: localhost:5173 (frontend dev server)
- API docs at /api/docs/ (drf-spectacular Swagger)

### Frontend
- React 19, Vite, Tailwind CSS v4
- Zustand for state management
- Axios with custom interceptors (auto-inject Bearer tokens)
- React Router for navigation
- Vitest for testing

---

## Development Commands

### Backend
```bash
python manage.py runserver              # Dev server (localhost:8000)
python manage.py migrate                # Apply migrations
python manage.py makemigrations         # Create migrations
python manage.py test                   # Run 21+ unit tests
python manage.py check                  # Django system check
python manage.py createsuperuser        # Create admin user
python manage.py shell                  # Django shell
```

### Frontend
```bash
cd frontend
npm install                             # Install dependencies
npm run dev                             # Dev server (localhost:5173)
npm test                                # Run 11+ Vitest tests
npm run test:watch                      # Tests in watch mode
npm run lint                            # ESLint
npm run lint --fix                      # Auto-fix linting
npm run build                           # Build for production
npm run preview                         # Preview production build
```

### Full Stack
```bash
# Terminal 1
python manage.py runserver              # Backend on :8000

# Terminal 2
cd frontend && npm run dev              # Frontend on :5173
```

---

## Testing Requirements

### What's Tested

**Backend (21 tests)**:
- User model: creation, validation, uniqueness, roles
- Login view: valid creds, invalid password, missing fields, inactive users
- Logout view: token invalidation, error handling
- Auth service: JWT token generation

**Frontend (11 tests)**:
- Auth store: state management, setAuth, clearAuth, token updates
- Auth API: login/logout API calls, error handling

### Running Tests

```bash
# Run all backend tests
python manage.py test

# Run specific test file
python manage.py test apps.authentication.tests

# Run specific test
python manage.py test apps.authentication.tests.LoginViewTests.test_login_with_valid_credentials

# Run all frontend tests
cd frontend && npm test

# Run frontend tests in watch mode
cd frontend && npm run test:watch
```

---

## Workflow Rules (STRICT)

These rules are enforced by the team. Claude Code must follow them.

### Branch & PR Rules

1. **Create feature branch** (never commit to main)
   ```bash
   git checkout main && git pull origin main
   git checkout -b feature/description
   ```
   Branch naming: `feature/*`, `bugfix/*`, `refactor/*`, `test/*`

2. **Validate before push** (must run `/validate-pr`)
   - Runs all tests locally (21 backend + 11 frontend)
   - Checks linting
   - Verifies build
   - Scans for secrets
   - Takes ~2-3 minutes
   - All checks must PASS before pushing

3. **Commit with conventional format**
   - **Claude Code**: Use `/commit` skill (auto-formats + co-author)
   - **Other editors**: Follow conventional format manually:
     ```bash
     git commit -m "feat(auth): add email verification

     Co-Authored-By: [Your Name] <your.email@example.com>"
     ```
   - Format: `<type>(<scope>): <message>`
   - Types: `feat`, `fix`, `test`, `docs`, `refactor`, `style`, `perf`
   - Example: `feat(auth): add email verification`

4. **Push to remote**
   ```bash
   git push -u origin feature/description
   ```

5. **Create PR on GitHub**
   - Add clear title and description
   - Reference any related issues

6. **Wait for approval + CI**
   - Team lead reviews code
   - GitHub Actions runs same tests as `/validate-pr` (automatic)
   - All checks must be green
   - Cannot merge until both are done

7. **Merge via GitHub UI only**
   - Click merge button on GitHub
   - Never merge locally or force-push

### Commit Rules

- **Always use `/commit` skill** — Ensures conventional format + co-author attribution
- **No direct commits to main** — Will be rejected by branch protection
- **One logical change per commit** — Keep history clean
- **Test before committing** — Run `/validate-pr` first

### PR Rules

- **All PRs go to main** — Feature branches merge to main only
- **Require 1 approval** — Team lead must review
- **All checks must pass** — GitHub Actions + linting + tests
- **No merging without approval** — Branch protection enforces this
- **No force-pushing** — Use PR process always

---

## Validation Before Push (Critical Step)

Before `git push`, you MUST validate all tests and checks locally.

### Option 1: Using Claude Code (Fast)
```bash
/validate-pr
```
This runs all checks in ~2-3 minutes. Runs:
- Django tests (21 tests)
- Django system check
- Frontend tests (11 tests)
- ESLint linting
- Vite build
- Secret scan

### Option 2: Manual Validation (Any Editor)
If using Cursor, Zed, Antigravity, or any other editor, run these manually:

**Backend**:
```bash
python manage.py test                   # Run all Django tests
python manage.py check                  # Django system check
```

**Frontend** (from `frontend/` directory):
```bash
npm test                                # Run Vitest tests
npm run lint                            # Check ESLint
npm run build                           # Verify Vite build
```

**Secret Scan**:
```bash
git diff --cached | grep -E 'secret|password|key|token|api_key' || echo "✅ No secrets found"
```

### Success Criteria
All of the above must pass before you push. If ANY fails, fix locally and re-run.

Output should show:
```
✅ Django tests: PASSED
✅ Django checks: PASSED
✅ Frontend tests: PASSED
✅ Frontend build: PASSED
✅ Frontend lint: PASSED
✅ Secret scan: PASSED

🎉 Ready for PR!
```

**Documentation**: `.claude/skills/validate-pr.md` (Claude Code only), or use manual commands above for any editor.

---

## GitHub Actions (Automatic CI/CD)

When you create a PR, GitHub automatically runs:

1. **Backend**: Django tests, migrations, system check
2. **Frontend**: Vitest tests, ESLint, Vite build
3. **Report**: Green ✅ (all pass) or Red ❌ (something failed)

**Merge Requirements**:
- ✅ All GitHub Actions checks must pass
- ✅ Team lead approval required
- ❌ Cannot merge without both

**If CI fails**:
1. See error in GitHub Actions logs
2. Fix locally
3. Run `/validate-pr` to verify fix
4. Push fix (CI reruns automatically)
5. Once green, merge

---

## Branch Protection Rules (GitHub)

`main` branch is protected:
- ❌ No direct pushes (all changes via PR)
- ✅ Requires 1 approval
- ✅ Requires all CI checks pass
- ✅ Blocks merge if anything fails

This prevents broken code from reaching main.

---

## Key Conventions

### File Organization
- Backend tests: `apps/*/tests.py`
- Frontend tests: `src/**/*.test.js`
- Frontend components: `src/pages/`, `src/components/`
- Frontend store: `src/store/`
- Frontend API: `src/api/`

### Testing Conventions
- Test files: `*.test.js` (frontend), `tests.py` (backend)
- Test naming: `test_<what_being_tested>` (backend), `test <description>` (frontend)
- One assertion per test when possible
- Mock external dependencies
- Use real test database (Django creates temporary test DB)

### Code Conventions
- Python: PEP 8 (Django defaults)
- JavaScript: ESLint rules (in `.eslintrc`)
- Commit messages: Conventional commits
- No hardcoded secrets (use environment variables)

---

## Common Development Tasks

### Adding a New Feature
```bash
1. git checkout -b feature/new-feature
2. Make changes
3. Write/update tests
4. /validate-pr (must pass)
5. /commit
6. git push
7. Create PR on GitHub
8. Wait for approval + CI
9. Merge
```

### Fixing a Bug
```bash
1. git checkout -b bugfix/issue-description
2. Write test that reproduces bug
3. Fix the bug
4. /validate-pr (test now passes)
5. /commit
6. git push
7. Create PR
8. Merge
```

### Running a Single Test
```bash
# Backend
python manage.py test apps.authentication.tests.LoginViewTests.test_login_with_valid_credentials

# Frontend
cd frontend && npm test -- authStore.test.js
```

### Adding a Dependency
```bash
# Backend
pip install package-name
# Then test: /validate-pr

# Frontend
cd frontend && npm install package-name
# Then test: /validate-pr
```

---

## Debugging Guide

### Django Test Fails
```bash
# Run with verbose output
python manage.py test --verbosity=2

# Run specific test
python manage.py test apps.authentication.tests.LoginViewTests.test_login_with_valid_credentials

# Check database
python manage.py shell
# In shell: User.objects.all()
```

### Frontend Test Fails
```bash
# Watch mode (auto-rerun)
cd frontend && npm run test:watch

# Check test file for typos
cat src/store/authStore.test.js

# Add debugging
console.log('State:', state)
# Then rerun npm test
```

### Build Fails
```bash
# Full error output
npm run build

# Check syntax
npm run lint

# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### API Not Responding
- Backend running? `python manage.py runserver`
- Correct port? Backend on 8000, frontend on 5173
- CORS configured? Check settings.py CORS_ALLOWED_ORIGINS
- Token valid? Check if expired (30 min lifetime)

---

## Important Notes for Claude Code

1. **Always validate before pushing**: Run `/validate-pr` before `git push`. Non-negotiable.

2. **Always use `/commit`**: Ensures proper formatting and team consistency.

3. **Never push to main**: Use feature branches always. Branch protection blocks direct pushes anyway.

4. **Never skip tests**: If `/validate-pr` fails, fix the issue. Don't commit broken code.

5. **Run migrations**: After pulling new changes, run `python manage.py migrate`.

6. **No force-pushing**: Never use `git push --force`. Use PR process.

7. **Check environment**: Database running? Services running? Dependencies installed?

8. **Read error messages**: They usually tell you exactly what's wrong.

9. **Test frequently**: Run `/validate-pr` multiple times during development.

10. **Communicate with team**: If stuck, ask. Better to ask than break things.

---

## Workflow Summary

```
FEATURE BRANCH → VALIDATE LOCALLY → COMMIT → PUSH → CREATE PR →
GITHUB ACTIONS → TEAM REVIEW → APPROVAL → MERGE → DONE
```

Each step is automated or enforced. Can't skip steps.

---

## Support & Troubleshooting

**`/validate-pr` fails?**
- Read error message
- Fix code locally
- Run `/validate-pr` again
- Repeat until pass

**GitHub Actions fails but local passes?**
- Different database or environment
- Run `python manage.py migrate` locally
- Check environment variables match
- Run `/validate-pr` again
- Push fix

**Can't merge PR?**
- All checks green? If not, `/validate-pr` locally
- Team lead approved? If not, wait for review
- Branch up to date? If not, pull and merge main

**Don't know what to do?**
- Read this file (CLAUDE.md) again
- Check `.claude/skills/validate-pr.md`
- Look at similar commits in history
- Ask team lead

---

## Files Reference

| File | Purpose |
|------|---------|
| `CLAUDE.md` | This file — all instructions Claude Code needs |
| `.claude/skills/validate-pr.md` | Validation skill documentation |
| `.github/workflows/ci.yml` | GitHub Actions configuration |
| `apps/authentication/tests.py` | 21+ backend unit tests |
| `frontend/vitest.config.js` | Frontend test configuration |
| `frontend/src/**/*.test.js` | 11+ frontend tests |
| `.github/CONTRIBUTING.md` | Additional contribution details (optional reading) |

---

## External URLs

- Backend API: http://localhost:8000
- Frontend: http://localhost:5173
- API Docs: http://localhost:8000/api/docs/
- Django Admin: http://localhost:8000/admin/

---

**Last Updated**: May 20, 2026
**Team**: 2 developers, feature-branch workflow
**Status**: Production-ready with automated testing and branch protection
