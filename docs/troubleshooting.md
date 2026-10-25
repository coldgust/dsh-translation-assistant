# Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Installation says the package is not a bundle | The path points at a subdirectory. Enter the repository root — the directory with `package.json` and its `dsh.bundle.patch`. |
| The bundle reports an error after the folder moved | A local install is a `link:` dependency, so moving or renaming the directory breaks it. Put it back, or uninstall and install again from the new path. |
| No sidebar entry after installing | Restart Harness on the desktop app, or reload the page under `dsh web`. If it is still missing, check that the bundle is switched on in **Plugins**. |
| Header shows "Translation service not ready" | No default model is selected in Settings, or the provider is unreachable. Pick a default model and reload. |
| The header shows no model picker | Only one route was discovered, so there is nothing to switch to. The notice above the editor names the provider whose listing failed; a `models` list in the plugin config is the manual fallback. |
| "The selected model cannot read images" (HTTP 422) | The routed model cannot read images. Choose a vision-capable model. |
| Importing a `.docx` says the browser cannot unpack it | `DecompressionStream` is unavailable in that browser. Save the file as `.txt`, `.md`, or `.html` and import that. |
| The downloaded HTML has no styling or links | Expected: the page translates text, so the export keeps paragraphs only. Keep the original file if you need the markup. |
| `New translation` seems to have deleted the document | It does not: the document stays in history and the page opens a blank form. Open the header chip to switch back. |
| A rollback lost the newer wording | It does not: the text you left is stored as a `Before rollback` revision. Open `Revisions` again and restore it. |
| Edits disappeared after clearing browser data | History and edits live in `localStorage` only; there is no cloud copy. |
