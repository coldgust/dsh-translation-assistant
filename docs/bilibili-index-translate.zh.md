# 附录：接入 B 站 Index-Translate 模型

## 模型简介

[Index-Translate](https://index-translate.bilibili.com/?p=/site/translate.html&lang=zh) 是 B 站开源的机器翻译模型系列，该页面即在线演示。它跑在 vLLM 上，接口是标准的 OpenAI Chat Completions，可以当普通自定义提供方接进 Harness，接好后本插件头部就能选中它。

- `Index-Translate-35B-A3B`：旗舰版，MoE 结构（35B 总参数 / 3B 激活），多语种互译，还能直接读图翻译图片里的文字 —— 在本插件里就是翻译、重译、评分、识图全都能做。
- `Index-Translate-9B` / `Index-Translate-2B`：更小更快的纯文本翻译模型，适合量大、只要速度的场景。

演示服务不需要密钥，也不承诺 SLA，适合当试验路由。

## 方法一：Web UI 配置（推荐）

1. 运行 `dsh web` 打开界面。
2. 侧边栏进「设置 → 模型」。
3. 点「添加自定义提供方」。
4. 填写配置：

   - Provider ID：`bilibili-translate`（自定义的小写标识符，仅用于内部识别这个提供商）
   - 基础 URL（Base URL）：`https://index-translate.bilibili.com/v1`
   - 协议（Protocol）：`OpenAI Completions`（`openai-completions`）
   - API Key：任意占位符，例如 `index`
   - 模型（Models）：点「获取可用模型」，应该能自动发现 `Index-Translate-35B-A3B`；如果失败，手动添加这个模型 ID

5. 保存后在模型下拉列表里选中它即可。

## 方法二：直接编辑配置文件

适合偏好文件配置或要脚本化的用户。编辑 `$DSH_HOME/settings.yaml`（桌面版实际是 `~/.dsh/profiles/desktop/cordis.patch.yml`），在 `llm-pi-ai` 段落的 `providers` 里加：

```yaml
llm-pi-ai:
  providers:
    bilibili-translate:                      # Provider ID
      apiKeyEnv: BILIBILI_TRANSLATE_API_KEY  # 引用一个环境变量名
      api: openai-completions
      baseURL: https://index-translate.bilibili.com/v1
      models:
        - id: Index-Translate-35B-A3B
```

注意 `apiKeyEnv` 是**引用**，不是值：Harness 进程里必须能读到这个环境变量。接口不校验密钥，给个非空值就行；从访达启动的 Harness 不继承 shell 环境变量，这种情况下直接用请求头更稳：

```yaml
      headers:
        Authorization: Bearer index
```

## 验证

重启 Harness（供应商注册发生在启动阶段），然后看本插件头部的模型下拉框：会多出一组 `bilibili-translate`，选中 `Index-Translate-35B-A3B` 就能用它翻译、重译、评分和识图。也可以直接查接口：

```bash
curl http://127.0.0.1:<端口>/dsh-translation/api/health
```

返回的 `models` 里出现 `provider: bilibili-translate` 的条目，即接入成功。

## 注意事项

- 公开演示部署：没有 SLA、没有公开的限流说明，也可能随时改版或下线。适合当试验路由，不适合放进生产链路。
- 35B 的上下文是 24,576 token，而本插件允许 12 万字符的文档。批量按 6 段 / 16 句切分，正常文章放得下，单个段落写到几万字就会超。用演示接口时建议把 `concurrency` 降到 `2`。
- 不要填真实密钥：接口根本不看它，而这个值会被存进本机凭据库。
