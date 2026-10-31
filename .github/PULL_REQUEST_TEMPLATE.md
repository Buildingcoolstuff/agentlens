## Summary

<!-- What does this PR do? (1-3 sentences) -->

## Related Issues

<!-- Link issues this PR closes or references -->
Closes #

## Type of Change

- [ ] 🐛 Bug fix (non-breaking)
- [ ] ✨ New feature (non-breaking)
- [ ] 💥 Breaking change (fix or feature that would break existing users)
- [ ] 📚 Documentation only
- [ ] 🏗️ Refactor / internal improvement
- [ ] 🧪 Tests only
- [ ] 🔧 CI / build / tooling

## Affected Packages

- [ ] `@agentlens/core`
- [ ] `@agentlens/schema`
- [ ] `@agentlens/runtime`
- [ ] `@agentlens/mcp`
- [ ] `agentlens` (CLI)
- [ ] `apps/extension`
- [ ] Root monorepo / CI

## Checklist

- [ ] `pnpm build` passes with no errors
- [ ] `pnpm check-types` passes (zero TypeScript errors)
- [ ] `pnpm test` passes (all existing tests green)
- [ ] New tests added for new behaviour (or explained why not needed)
- [ ] No `any` types introduced
- [ ] NCS constraints in `facts.config.json` still valid (not expired)
- [ ] `@agentlens/runtime` IIFE bundle is still ≤ 5 KB gzipped after changes
- [ ] Documentation updated if public API changed
- [ ] Changeset added (`pnpm changeset`) if a package version bump is needed

## Testing Instructions

<!-- Step-by-step instructions for a reviewer to manually test this PR -->

```sh
# Example:
npx agentlens audit https://example.com
```

## Screenshots / Output (if applicable)

<!-- Paste CLI output, extension screenshots, or score diffs here -->
