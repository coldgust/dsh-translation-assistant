# Installing from source, upgrading, and uninstalling

The main README covers the one-line install (`dsh plugin --profile web add dsh-translation-assistant`) and the GUI flow for the npm package. This page has the rest of the ways to get the plugin in, plus how to upgrade and remove it.

## A local directory (for hacking on it)

Best if you intend to keep working on the code: edits to `client.js` are swapped into the open page by the artifact watcher, and Host changes apply after a restart.

1. Put the checkout somewhere you will not move it:

   ```bash
   git clone https://github.com/coldgust/dsh-translation-assistant.git ~/code/dsh-translation
   ```

2. Open Harness and pick **Plugins** in the sidebar.
3. Press **Add plugin** and enter the **absolute path of the repository root** in **Package name or address** — the directory that holds `package.json`, for example `/Users/you/code/dsh-translation`.
4. Press **Install**, wait for pnpm to finish, then press **Enable now**.
5. A **Translation Assistant** entry appears in the sidebar.

This records a `link:` dependency: the profile points at that directory instead of copying it. Do not move or rename the directory afterwards — the plugin will fail to load and has to be installed again.

## A Git address

For when you do not want a local copy. Enter `https://github.com/coldgust/dsh-translation-assistant.git` where the local-directory method asks for the path and keep the rest. The code lands in the profile's `node_modules`, so edits never reach your repository and upgrading means uninstalling and reinstalling.

## Registering it by hand

If you prefer files or want to script the setup, edit the profile's `package.json` (`~/.dsh/profiles/desktop/package.json` on the desktop app). Only the two places below concern this plugin; keep the profile's existing bundles and dependencies. Using the published package:

```json
{
  "dsh": {
    "profile": {
      "bundles": ["dsh-translation-assistant"]
    }
  },
  "dependencies": {
    "dsh-translation-assistant": "^1.18.1"
  }
}
```

Use `"link:/Users/you/code/dsh-translation"` instead to point at a local checkout.

Then run `pnpm install` in that directory and restart Harness. Keep the profile's existing entries in the `bundles` array and append this one at the end. The profile's `cordis.patch.yml` stays untouched: the plugin row comes from the patch this package ships (`dsh.bundle.patch` in `package.json` → `cordis.patch.yml`).

## After installing

- **Plugins → Installed plugins** lists **Translation Assistant**, switched on, and its detail page shows the single `translation-assistant` row it contributes.
- If the header says "Translation service not ready", pick a default model under **Settings → Models** and reload the page.
- To use an outside model — Bilibili's Index-Translate in the [appendix](bilibili-index-translate.md), for instance — register the route first; the header picker then offers it.

## Upgrading and uninstalling

| Installed as | Upgrade | Uninstall |
| --- | --- | --- |
| npm package | Uninstall it first, then install again | **Uninstall** on the bundle's page |
| Local directory | `git pull`, then reload; Host changes need a restart | Same as above |
| Git address | Uninstall, then install again | Same as above |
| By hand | Change the version and `pnpm install`; for a link, `git pull` and restart | Delete the `bundles` entry and the dependency, then `pnpm install` |
