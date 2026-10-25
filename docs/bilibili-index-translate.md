# Appendix: adding Bilibili's Index-Translate models as a route

## The model

[Index-Translate](https://index-translate.bilibili.com/?p=/site/translate.html&lang=zh) is Bilibili's open machine-translation model family; that page is its online demo. It runs on vLLM and speaks standard OpenAI Chat Completions, so it registers as an ordinary custom provider and then shows up in this plugin's header picker.

- `Index-Translate-35B-A3B` — the flagship: a mixture-of-experts model (35B total parameters, 3B active) that translates between many languages and can also read text straight out of an image, which in this plugin means translation, retranslation, scoring, and OCR all work.
- `Index-Translate-9B` / `Index-Translate-2B` — smaller, faster text-only models for high volume.

The demo needs no API key and comes with no SLA, so treat it as a playground route.

## Method 1: the Web UI (recommended)

1. Run `dsh web` and open the interface.
2. Go to **Settings → Models**.
3. Click **Add a custom provider**.
4. Fill in the form:

   - **Provider ID**: `bilibili-translate` — a lowercase identifier you choose, used internally to recognise the provider
   - **Base URL**: `https://index-translate.bilibili.com/v1`
   - **Protocol**: `OpenAI Completions` (`openai-completions`)
   - **API Key**: any placeholder, for example `index`
   - **Models**: click **Fetch available models**; it should discover `Index-Translate-35B-A3B`. If that fails, add the model id by hand.

5. Save, then pick the Bilibili model from the dropdown.

## Method 2: edit the settings file directly

For file-based or scripted setups. Edit `$DSH_HOME/settings.yaml` (on the desktop app the live file is `~/.dsh/profiles/desktop/cordis.patch.yml`) and add an entry under `providers` inside the `llm-pi-ai` section:

```yaml
llm-pi-ai:
  providers:
    bilibili-translate:                      # Provider ID
      apiKeyEnv: BILIBILI_TRANSLATE_API_KEY  # names an environment variable
      api: openai-completions
      baseURL: https://index-translate.bilibili.com/v1
      models:
        - id: Index-Translate-35B-A3B
```

Note that `apiKeyEnv` is a *reference*, not a value: the Harness process has to be able to read that variable. The endpoint ignores the key, so any non-empty value works. A Harness launched from the Dock does not inherit your shell environment; if the variable cannot resolve, send the placeholder as a header instead:

```yaml
      headers:
        Authorization: Bearer index
```

## Verify

Restart Harness — providers are registered at boot. This plugin's header picker then gains a `bilibili-translate` group, and picking `Index-Translate-35B-A3B` pins it for translation, retranslation, scoring, and OCR. You can also check the endpoint directly:

```bash
curl http://127.0.0.1:<port>/dsh-translation/api/health
```

Entries under `models` with `provider: bilibili-translate` mean the route is live.

## Caveats

- A public demo deployment: no SLA, no published rate limit, and it may change or disappear. A playground route, not production capacity.
- Context is 24,576 tokens on the 35B, while this plugin accepts documents up to 120,000 characters. Batches are 6 paragraphs or 16 sentences, so normal documents fit; a single paragraph of tens of thousands of characters does not. Drop `concurrency` to `2` for the demo endpoint.
- Do not paste a real key. The endpoint ignores it, and whatever you type is stored in your local credential store.
