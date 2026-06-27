# Git & Deploy Workflow — ChartViewPro

---

## Branches

- **`develop`**: Daily development branch. All code is committed here.
- **`main`**: Production branch. Only updated when officially deploying.

---

## Day-to-day work

Always make sure you're on the `develop` branch:

```bash
git checkout develop
git add .
git commit -m "feat/fix: short description"
git push origin develop
```

---

## Deploying to Production (when user requests)

Follow these 4 steps in order:

**Step 1 — Squash commits**
```bash
git checkout develop
git reset --soft <last-stable-commit-hash-on-main>
git add .
git commit -m "feat: [Feature name / Version]"
git push -f origin develop
```

**Step 2 — Merge into main**
```bash
git checkout main
git merge develop
```

**Step 3 — Tag the version**
```bash
git tag -a v1.x.x -m "Release v1.x.x"
git push origin main --tags
```

**Step 4 — Switch back to develop**
```bash
git checkout develop
```

---

## Important rules
- **Never merge** dozens of messy commits directly from develop into main — always squash first
- **Always switch back to develop** after deploying
- Vercel/Netlify auto-deploys when main is pushed
