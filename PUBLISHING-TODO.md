# TODO for publishing

What's left before Syntax Tutor 0.1.0 can go on the VS Code Marketplace. Delete this file once it's published.

Already done: MIT license, changelog (one 0.1.0 section), icon, keywords and categories. All tests pass, `npm run package` builds cleanly, and both the name "Syntax Tutor" and the publisher ID `maartenthomassen` were still free on the Marketplace (checked 2026-10-16).

## 1. Create the GitHub repository and push

- [ ] Create an empty repository on GitHub. Don't add a README or license: the project already has both.
- [ ] Add it as the remote and push:

  ```bash
  git remote add origin https://github.com/<you>/syntax-tutor.git
  git push -u origin main
  ```

- [ ] In `package.json`, add `repository`, `bugs` and `homepage` fields, and remove `--allow-missing-repository` from the `package` script (Claude can do this once you have the URL).

The repository matters for two reasons. The Marketplace page links to it for issues and source code. And images in the README only work with a `repository` field: the packaging tool (`vsce`) uses it to turn relative image paths into full URLs.

## 2. Add screenshots (strongly recommended)

- [ ] Capture the images described in the hidden comment under "Screenshots" in `README.md`: a hover popup, a GIF of the scope highlight, a jump target and a doc-comment hover.
- [ ] Also capture the **Explain This Line** panel, the standout feature: for example with a few nested lines selected.
- [ ] Save them in `images/` and add `!images/*.png` and `!images/*.gif` to `.vscodeignore`.
- [ ] Replace the hidden comment in the README with a "## Screenshots" section that shows them (Claude can do this once the images and the repository field are in place).

## 3. Create a Marketplace publisher

Only you can do this.

- [ ] Sign in at https://marketplace.visualstudio.com/manage with a Microsoft account and create a publisher with the ID **`maartenthomassen`**. It must match `publisher` in `package.json`.
- [ ] In Azure DevOps (https://dev.azure.com), create a Personal Access Token with:
  - Organization: **All accessible organizations**
  - Scope: **Marketplace → Manage**

## 4. Publish

- [ ] Log in with the token:

  ```bash
  npx vsce login maartenthomassen
  ```

- [ ] Build and publish. Use `--no-dependencies` because everything is already bundled into `dist/`:

  ```bash
  npm run package && npx vsce publish --no-dependencies
  ```

## Optional

- [ ] **Open VSX**, so people using Cursor, VSCodium or Windsurf can install it too. Create an account at https://open-vsx.org, get an access token, then:

  ```bash
  npx ovsx create-namespace maartenthomassen -p <token>
  npx ovsx publish syntax-tutor-0.1.0.vsix -p <token>
  ```

- [ ] **Check the shortcut.** In VS Code, open **Preferences: Open Keyboard Shortcuts** and search for `cmd+shift+alt+e`, to make sure no other extension you use already has it.
