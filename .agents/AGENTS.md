
## Documentation Rules
- Never delete old documentation or implementation plans unless explicitly requested by the user. If updating, update in place, or if the document becomes too long or represents a completely new module, create a new separate artifact file.
- Documentation files must always exist in **exactly 2 versions**: `filename_vn.md` (Vietnamese) and `filename_en.md` (English). No other naming variants. After both versions are created, delete the original single-language file if one existed.
- **Always update BOTH language versions at the same time.** Any edit to `_vn.md` must be mirrored in `_en.md` and vice versa. Never leave one version out of sync.

## Git & Deployment Rules
- Always work on `develop` branch.
- When the user asks to "deploy" or "merge to main":
  1. Squash all recent commits on `develop` (`git reset --soft <hash>`).
  2. Merge `develop` into `main` (`git checkout main`, `git merge develop`).
  3. Create a tag (`git tag -a v<new_version> -m "Release v<new_version>"`) and push.
  4. Always switch back to `develop` branch after deployment (`git checkout develop`)!

