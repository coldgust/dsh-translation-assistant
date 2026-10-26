# 参考手册：结构、配置、本机数据、限制与开发

## 实现结构

| 文件 | 作用 |
| --- | --- |
| `host/index.js` | 宿主侧：注册 `/dsh-translation/api` JSON 路由和 `translation_assistant` 工具，校验请求，解析模型路由。 |
| `host/engine.js` | 提示词构造、流式调用封装、重试、分批翻译（失败时逐段回退）、重译、片段与全文评分、图片 OCR。不依赖 Harness，可用假 LLM 流做单元测试。 |
| `client.js` | 浏览器侧：`main` 页面、侧边栏入口图标、全部交互状态与渲染。 |
| `package.json` | bundle 声明：`dsh.bundle.patch` 指向自带的 `cordis.patch.yml`，`dsh.client` 声明浏览器侧入口与依赖的侧边栏包。 |
| `cordis.patch.yml` | 插入宿主插件行。 |
| `locale/en.json`、`locale/zh.json` | 插件管理器的标题与描述。 |

页面通过同源请求访问宿主：

| 接口 | 用途 |
| --- | --- |
| `GET /dsh-translation/api/health` | 服务状态、当前模型名、档案默认模型、按 provider 分组的可切换模型列表，以及各 provider 的列举失败原因。 |
| `POST …/translate` | 一次请求翻译 `sentences` / `paragraphs` 两组片段；也支持整篇 `document` 一次翻完——字符串（原文原样，回包保持段落结构）或段落数组（回包为对齐的数组）。 |
| `POST …/retranslate` | 重译一个片段或整篇文档（`kind: document`），可带 `extraPrompt`。 |
| `POST …/score` | 给一个片段打分（0–100 加一句评语）。 |
| `POST …/score-document` | 给整篇原文/译文打分。 |
| `POST …/ocr` | 识别图片文字（base64 图片 + 媒体类型）。 |

当 `Origin` 头指向其它来源时 POST 会被拒绝，请求体上限 24 MiB。每个 POST 都可带可选的 `route: { provider, model }`；不带时跟随配置或档案的默认路由。目录里没有的模型会在调用前以 HTTP 400 拒绝；只有目录本身为空（发现失败）时才放行，让模型服务自己判断。

## 配置

所有字段可选，写在插件行里（`cordis.patch.yml` 或插件管理器）：

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `provider`、`model` | 当前默认选择 | 固定所有调用使用的模型路由。 |
| `reasoningEffort` | 未设置 | 可选的推理强度，透传给路由。 |
| `models` | 未设置（自动发现） | 给头部下拉框补充路由，例如 `[{ provider: deepseek-account, model: deepseek-pro, label: Pro }]`。会和宿主 LLM 注册表发现的结果合并，正在使用的路由总会在列表里。 |
| `targetLanguage` | `中文` | 默认目标语言。 |
| `sourceLanguage` | 未设置（自动检测） | 默认原文语言，页面可以覆盖。 |
| `maxTokens` | `8192` | 翻译调用的输出上限。 |
| `retranslateMaxTokens` | `4096` | 单段重译的输出上限；整篇重译走通用默认。 |
| `scoreMaxTokens` | `4096` | 评分的输出上限。 |
| `ocrMaxTokens` | `4096` | 图片识别的输出上限。 |
| `maxRetries` | `1` | 供应商临时失败的重试次数。 |
| `scoreRetries` | `1` | 评分回复无法解析时的重试次数。 |
| `sentenceChunk`、`paragraphChunk` | `16`、`6` | 每批翻译的片段数。 |
| `concurrency` | `3` | 同时进行的批次数。 |
| `tool` | `true` | 设为 `false` 可隐藏 Agent 工具。 |

## 本机保存的数据

| 键 | 内容 |
| --- | --- |
| `dsh-translation-assistant:history:v1` | 最多 200 条（约 200 万字符），置顶优先，其余按最近使用排序。每条文档自带修改记录：最多 100 份、20 万字符。 |
| `dsh-translation-assistant:session:v1` | 上次打开的文档 id。 |
| `dsh-translation-assistant:prefs:v2` | 原文/目标语言、对照视图、全文显示方式、翻译模式、选中的模型路由（`null` 表示跟随默认），以及工作区根目录与输出设置。 |
| `dsh-translation-assistant:document:v1` | 1.1.x 的单文档旧键：首次启动时并入历史后清空。 |

历史、编辑和偏好都只留在浏览器里；只有被翻译、重译、评分或从图片中读出的文本会发送到模型路由。清除该站点的浏览器数据会丢失历史，服务端没有副本。

## 限制

- 单次翻译请求最多 400 个片段；单个片段 20,000 字符；合计 120,000 字符。连贯优先和对齐优先模式的单次请求上限 60,000 字符，超出自动改为按段分批。
- 修改记录每份文档最多 100 份、合计 20 万字符，超出后先丢最旧的快照。它也计入历史的总预算，改动很多的长文档可能挤掉更早的文档。
- 全文评分每侧最多 60,000 字符（合计 120,000）。
- 图片支持 PNG、JPEG、WebP、GIF，单张 12 MiB、单次请求 24 MiB。
- 导入文件单个不超过 8 MiB，取出的正文仍要满足 12 万字符的翻译预算。`.docx` 解包依赖浏览器的 `DecompressionStream`（Chrome 80+、Firefox 113+、Safari 16.4+），不支持时会提示改存 `.txt`、`.md` 或 `.html`。
- 工作区文件：读取支持 `.txt`、`.text`、`.md`、`.markdown`、`.log`、`.html`、`.htm`、`.xhtml`（`.docx` 只读）；写回仅限纯文本，单次 8 MiB；目录遍历最多 6 层、最多返回 500 个文件。
- 翻译规范：工作区根下的 `.translation-spec/` 目录存放 `.md` 规范文档，翻译、重译、评分、按建议优化等 AI 请求都会自动附带（最多 20 个、单个 64 KiB、合计 256 KiB，超限跳过）。抽屉里可查看、编辑、新增、删除；默认附带，可开关关闭。
- HTML 只翻译可见正文：脚本、样式、`<head>` 和属性都会丢掉。下载的 HTML 一段一个 `<p>`，不还原链接、加粗等行内标签。
- 评分要求模型稳定输出 `SCORE:` / `COMMENT:` 两行，也接受 JSON，形状不对会重试一次。评分是模型判断，不是权威指标。

## 开发与验证

本目录就是已安装的 bundle（档案直接链接到这里），改 `client.js` 会被热替换到已打开的页面；宿主侧改动需重启 Harness。

```bash
# 134 项单元/集成测试：引擎（翻译/重译/评分/OCR）、HTTP handler、模型目录发现与
# 路由覆盖、工作区文件端点，以及用极简 React harness 渲染的页面（不需要浏览器）。
node --test 'test/*.test.mjs'
```

维护提示：

- 页面会在请求前先按宿主限制做检查（400 片段 / 约 12 万字符），超限时给出本地化提示而不是发请求。
- 模型发现走 `@deepseek-ai/dsh-llm` 的正式接口：`listProviders()` 列出已注册路由，再对每个 provider 调 `listModels(providerId)`；无参调用会抛 `NO_ADAPTER`，所以通用探测在现行宿主上发现不到任何模型。某个 provider 列举失败只记入 `modelFailures`，不影响其它。结果缓存 60 秒，`llm/adapters-updated` 时失效；只有请求带 `route` 时才触发发现。
- provider 多于一个时，下拉框按 provider 分组；`default` 项始终显示档案的默认模型，不受当前路由影响。
- `.docx` 读取是一个小 ZIP 遍历器（中央目录 → 本地头 → `DecompressionStream(deflate-raw)`）加 `word/document.xml` 去标签，页眉页脚和批注不管。HTML 用正则解析，Node 测试环境也能跑。
- 工作区服务（`host/workspace.js`）把每个路径都相对根目录解析并拒绝越界（含符号链接），读写白名单分开（写更严），尺寸与列表数量都有上限。
- 评分默认隐藏是刻意设计：只有显式请求才获取。
- 开机打开「最近使用」的文档；打开旧稿不更新时间，编辑才更新。
- 历史裁剪先丢最旧的未置顶条目，置顶文档不会被预算挤掉。
- 修改记录存「改动前」的文档，与最新快照相同则不写入，一次批量优化只多一条。
- `docs/screenshots/` 里的截图是真实页面在 mock 数据下按 1280 px 宽度渲染的（2 倍图，缩到 1600 px）。界面改版后重拍。
- CSS 写在模板字符串里，注释中出现反引号会截断字面量。自查办法：数反引号（应为 0）并比较 `{` 与 `}` 数量。
