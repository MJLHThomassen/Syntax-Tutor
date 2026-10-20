# Notes for agents working on Syntax Tutor

See README.md for what the extension does, how it is built ("How it works") and how to add a language.

## Releasing

Every version published to the VS Code Marketplace gets a git tag `vX.Y.Z` (semver, with a `v`) that matches the published `version` in `package.json` exactly, on the commit that was published.

1. Bump the version without a tag of its own: `npm version X.Y.Z --no-git-tag-version` (updates `package.json` and `package-lock.json`). Check the Marketplace first (`npx vsce show MJLHThomassen.syntax-tutor`): a version that is already published can't be published again.
2. In `CHANGELOG.md`, rename `## Unreleased` to `## X.Y.Z`. Update the `.vsix` file name in README.md's install command.
3. Run `npm test` (and `npm run test:vscode` if you can), then `npm run package`.
4. Commit as "Release X.Y.Z" and push.
5. Publish that exact package: `npx vsce publish --no-dependencies --packagePath syntax-tutor-X.Y.Z.vsix`.
6. Tag the published commit and push the tag:

   ```bash
   git tag -a vX.Y.Z -m "Syntax Tutor X.Y.Z"
   git push origin vX.Y.Z
   ```

   The tag must point at the commit the `.vsix` was built from, and its version must equal `package.json`'s `version` there. Never move or reuse a tag of a published version.
