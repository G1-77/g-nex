<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:gnex-workflow -->
# GNEX Workflow Rules

- After completing any code change: verify (`npx tsc --noEmit`, eslint on touched paths), then commit and push to GitHub (`origin/main`) without waiting to be asked.
- Update `MILESTONES.md` with every pushed change: add/extend the phase section with status, delivered items, key files, and verification results.
- Never commit secrets or keys.
<!-- END:gnex-workflow -->
