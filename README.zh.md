# 翻译助手（Translation Assistant）

一个 DeepSeek Harness 插件，把 Web 界面变成翻译工作台：贴文本、拖文件、粘截图都能翻，原文和译文逐段对照，译文可以直接改，还能让另一个模型评审译文。所有内容只留在本机，模型可按请求切换。

[English](README.md)

![逐段对照工作台：原文与译文左右并列，评分可见](https://raw.githubusercontent.com/coldgust/dsh-translation-assistant/main/docs/screenshots/workspace.png)

## 安装

面向 DeepSeek Harness 0.2.x（桌面版或 `dsh web`，在 0.2.1 上验证）。插件已发布到 npm，包名是 `dsh-translation-assistant`；四种装法选一种，装完按提示重启或刷新页面。插件自身不带模型，用之前要在「设置 → 模型」里选好默认模型。

### 方法一：从 npm 安装（推荐）

1. 打开 Harness，左侧栏进「插件」，点「添加插件」。
2. 在「包名或地址」里填 `dsh-translation-assistant`，点「安装」，装完点「立即启用」。
3. 左侧栏出现「翻译助手」入口，就装好了。

### 方法二：本地目录（改代码时用）

适合自己维护：改 `client.js` 会被产物监听器热替换，改宿主侧重启即可生效。

1. 把仓库放在一个不会随手移动的位置：

   ```bash
   git clone https://github.com/coldgust/dsh-translation-assistant.git ~/code/dsh-translation
   ```

2. 打开 Harness，左侧栏进「插件」。
3. 点「添加插件」，在「包名或地址」里填入**仓库根目录的绝对路径**——含 `package.json` 的那一层，例如 `/Users/you/code/dsh-translation`。
4. 点「安装」，等 pnpm 跑完，再点「立即启用」。
5. 左侧栏出现「翻译助手」入口，就装好了。

这样登记的是一个 `link:` 依赖：档案指向这个目录本身，不复制副本。所以装完之后别再移动或改名该目录，否则插件会加载失败，得重新安装。

### 方法三：Git 地址

不想在本地留副本时用。按方法二填 path 的那一步改成填仓库地址 `https://github.com/coldgust/dsh-translation-assistant.git`，其余相同。代价是代码被装进档案的 `node_modules`，改动不回流到仓库，升级只能卸载重装。

### 手工登记

喜欢文件配置或要脚本化时，改档案的 `package.json`（桌面版是 `~/.dsh/profiles/desktop/package.json`）。下面只列与本插件有关的两处，档案原有的 bundle 与依赖照旧保留。用 npm 上的版本：

```json
{
  "dsh": {
    "profile": {
      "bundles": ["dsh-translation-assistant"]
    }
  },
  "dependencies": {
    "dsh-translation-assistant": "^1.16.4"
  }
}
```

想指向本机目录的话，把依赖改成 `"link:/Users/you/code/dsh-translation"`。

然后在同一目录跑 `pnpm install` 并重启 Harness。`bundles` 数组里保留档案原有的条目，只在末尾追加这一行。档案的 `cordis.patch.yml` 不用动：插件行由本包自带的 patch 插入（`package.json` 的 `dsh.bundle.patch` → `cordis.patch.yml`）。

### 装好之后

- 「插件 → 已安装插件」里能看到「翻译助手」，开关打开，点进去能看到它自带的一行 `translation-assistant`。
- 页头若显示「翻译服务未就绪」，去「设置 → 模型」选一个默认模型，再刷新页面。
- 想接外部模型（例如文末附录里的 B 站 Index-Translate），接好后头部下拉框里能直接选。

### 升级与卸载

| 方式 | 升级 | 卸载 |
| --- | --- | --- |
| npm 包 | 先在插件页卸载，再按方法一重装新版 | 插件页对该 bundle 点「卸载」 |
| 本地目录 | `git pull` 后刷新页面；宿主侧改动需要重启 | 同上 |
| Git 地址 | 先卸载再按方法三重装 | 同上 |
| 手工登记 | 换版本号后 `pnpm install`；本地目录则 `git pull` 后重启 | 删掉 `bundles` 与 `dependencies` 两处，再 `pnpm install` |

## 能做什么

### 翻译

- **逐段、逐句两种视角** —— 默认「逐段对比」，可切「逐句对比」，两种粒度在同一次翻译里一起返回。速度优先模式下按块并发，头部显示「翻译中 n/m」进度，按段落计数。
- **三种翻译模式（默认连贯优先）** —— 新建翻译和全文视图的模式下拉框里三选一，旁边的问号图标悬浮显示区别：
  - **连贯优先** —— 整篇文本一次发给模型，上下文最完整、译文最连贯。回包按空行拆回段落，段数对不上时自动回退批量路径。
  - **对齐优先** —— 原文分段成 JSON 数组一次发给模型，要求返回等长的译文数组，段落一一对应最有保障。
  - **速度优先** —— 按块并发（每块 16 句或 6 段、3 路并发），长文最快；每块独立翻译，段落间衔接不如前两种。
  - 回包对不上、宿主不认识新协议或文本超长时，自动回退为批量翻译，不报错。

  | 模式 | 特点 | 适用场景 |
  | --- | --- | --- |
  | 连贯优先 | 全文一次请求，上下文最完整 | 文章、报告等重视行文连贯的内容；默认模式 |
  | 对齐优先 | 段落数组协议，段落一一对应最有保障 | 术语表、字幕、对照排版等要求严格对齐的内容 |
  | 速度优先 | 分块 3 路并发，长文最快 | 限时处理大文档；对段落间衔接要求不高时 |

- **整份文件** —— 支持 `.txt`、`.md`、`.log`、`.html`、`.htm`、`.docx`。Word 在浏览器里解包（不引第三方库，原文件不上传）；HTML 先丢掉脚本、样式和 head，只有可见正文会送给模型。
- **图片** —— 粘贴或选择截图，长边压到 2048 px 后转 JPEG 上传，识别出的文字填入原文并直接翻译。

### 校对与打磨

- **每一段都能改** —— 原文与译文左右并列，改句子会重拼所在段落，改段落会按句子边界拆回各句。
- **全文** ——「译文」（可编辑）、「原文」、「对比」三种模式；编辑按空行拆回对应片段（没有空行时一行就是一段），复制和整篇评分都在这里。
- **重译** ——「AI 重译」重做单段，「提示词重译」可以附上「更口语一些」这类要求；全文视图里同样可用，并跟随翻译模式：连贯优先和对齐优先整篇一次请求，速度优先逐段并发并显示进度。每次留一条修改记录。
- **按需评分** —— 评分默认隐藏；可以给单段、当前视图或整篇打分，再从工具栏统一显示。改动译文会清掉对应的评分。
- **按评语重写** —— 评分旁的「按建议优化」把分数和评语作为要求重写该段；「全部优化」把当前视图里评过分的段落批量重写，三个一批。评分隐藏时不显示这些按钮。
- **停止进行中的任务** —— 停止按钮总是出现在进度旁边：新建页在翻译按钮旁，全文视图在「AI 重译」和「按建议优化」按钮旁，逐段/逐句视图在「全部优化」以及正在重译的单段按钮旁。在途请求被取消，尚未开始的分块不再发出，已经落地的改写会保留。

### 留痕

- **本机历史** —— 最多 200 篇，带标题、时间、语言对和片段数；搜索会在原文和译文里匹配并给出上下文。置顶不影响最近使用时间，删除需要点两下。
- **修改记录** —— 每篇最多 100 个快照：机器初译、每次 AI 改动前、每次回退前。抽屉里标出与当前文本相差几段，可一键回退；回退前会先把被覆盖的文本存档，所以回退也能撤销。

![翻译历史抽屉：搜索、置顶条目与片段数](https://raw.githubusercontent.com/coldgust/dsh-translation-assistant/main/docs/screenshots/history.png)

### 集成

- **模型切换** —— 可用模型多于一个时，头部下拉框按 provider 分组。「跟随默认模型」跟随档案设置；选中其它条目则把该路由固定用于翻译、重译、评分和识图，选择记在本机。原模型不可用时提示并切回默认。外部模型接入见[附录](#附录接入-b-站-index-translate-模型)。
- **Agent 工具** —— 同一套引擎也暴露成 `translation_assistant`（`action: translate | retranslate | score | score_document`），可以在对话里直接翻译或评审。

## 应用场景

### 一个模型翻译，另一个模型评分和优化

先让快而便宜的模型出初稿，再换最强的模型挑毛病并重写。模型选择对翻译、重译、评分和识图同时生效，两半可以来自不同供应商。

1. 在头部切到快的翻译模型 —— `Index-Translate-9B`，量大时用 `Index-Translate-2B` —— 点「开始翻译」，或者直接把文件拖进来。
2. 切到手上最强的模型：`deepseek-reasoner`、`GPT-5`，或者 `Index-Translate-35B-A3B`。
3. 点「显示评分」，再点「全部评分」。每段会返回 0–100 的分数和一句评语。
4. 点「全部优化」，或者对某一段点「按建议优化」。重写请求会带上分数和评语作为要求，强模型只改它自己挑出来的问题。
5. 打开「修改记录」对比各次结果：每次 AI 重写都留了快照，回退本身也还能撤销。

重写和手改都会清掉过期评分，文本没变就不用重新评分。

![修改记录抽屉：带标签的历次版本，以及与当前文本的差异段数](https://raw.githubusercontent.com/coldgust/dsh-translation-assistant/main/docs/screenshots/revisions.png)

### 一整份文档，从头到尾

把 `.docx`、`.md` 或 `.html` 文件拖进来，一次请求整份翻完。文件名会留在文档上，「下载译文」按原格式写回（`.md` / HTML / `.txt`），空行分段结构保留。

![全文的对比模式：显示导入的文件名和下载译文按钮](https://raw.githubusercontent.com/coldgust/dsh-translation-assistant/main/docs/screenshots/full-text.png)

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
| `dsh-translation-assistant:prefs:v2` | 原文/目标语言、对照视图、全文显示方式、翻译模式，以及选中的模型路由（`null` 表示跟随默认）。 |
| `dsh-translation-assistant:document:v1` | 1.1.x 的单文档旧键：首次启动时并入历史后清空。 |

历史、编辑和偏好都只留在浏览器里；只有被翻译、重译、评分或从图片中读出的文本会发送到模型路由。清除该站点的浏览器数据会丢失历史，服务端没有副本。

## 限制

- 单次翻译请求最多 400 个片段；单个片段 20,000 字符；合计 120,000 字符。连贯优先和对齐优先模式的单次请求上限 60,000 字符，超出自动改为按段分批。
- 修改记录每份文档最多 100 份、合计 20 万字符，超出后先丢最旧的快照。它也计入历史的总预算，改动很多的长文档可能挤掉更早的文档。
- 全文评分每侧最多 60,000 字符（合计 120,000）。
- 图片支持 PNG、JPEG、WebP、GIF，单张 12 MiB、单次请求 24 MiB。
- 导入文件单个不超过 8 MiB，取出的正文仍要满足 12 万字符的翻译预算。`.docx` 解包依赖浏览器的 `DecompressionStream`（Chrome 80+、Firefox 113+、Safari 16.4+），不支持时会提示改存 `.txt`、`.md` 或 `.html`。
- HTML 只翻译可见正文：脚本、样式、`<head>` 和属性都会丢掉。下载的 HTML 一段一个 `<p>`，不还原链接、加粗等行内标签。
- 评分要求模型稳定输出 `SCORE:` / `COMMENT:` 两行，也接受 JSON，形状不对会重试一次。评分是模型判断，不是权威指标。

## 开发与验证

本目录就是已安装的 bundle（档案直接链接到这里），改 `client.js` 会被热替换到已打开的页面；宿主侧改动需重启 Harness。

```bash
# 111 项单元/集成测试：引擎（翻译/重译/评分/OCR）、HTTP handler、模型目录发现与
# 路由覆盖，以及用极简 React harness 渲染的页面（不需要浏览器）。
node --test 'test/*.test.mjs'
```

维护提示：

- 页面会在请求前先按宿主限制做检查（400 片段 / 约 12 万字符），超限时给出本地化提示而不是发请求。
- 模型发现走 `@deepseek-ai/dsh-llm` 的正式接口：`listProviders()` 列出已注册路由，再对每个 provider 调 `listModels(providerId)`；无参调用会抛 `NO_ADAPTER`，所以通用探测在现行宿主上发现不到任何模型。某个 provider 列举失败只记入 `modelFailures`，不影响其它。结果缓存 60 秒，`llm/adapters-updated` 时失效；只有请求带 `route` 时才触发发现。
- provider 多于一个时，下拉框按 provider 分组；`default` 项始终显示档案的默认模型，不受当前路由影响。
- `.docx` 读取是一个小 ZIP 遍历器（中央目录 → 本地头 → `DecompressionStream(deflate-raw)`）加 `word/document.xml` 去标签，页眉页脚和批注不管。HTML 用正则解析，Node 测试环境也能跑。
- 评分默认隐藏是刻意设计：只有显式请求才获取。
- 开机打开「最近使用」的文档；打开旧稿不更新时间，编辑才更新。
- 历史裁剪先丢最旧的未置顶条目，置顶文档不会被预算挤掉。
- 修改记录存「改动前」的文档，与最新快照相同则不写入，一次批量优化只多一条。
- `docs/screenshots/` 里的截图是真实页面在 mock 数据下按 1280 px 宽度渲染的（2 倍图，缩到 1600 px）。界面改版后重拍。
- CSS 写在模板字符串里，注释中出现反引号会截断字面量。自查办法：数反引号（应为 0）并比较 `{` 与 `}` 数量。

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| 安装时提示「不是插件包」 | 路径选到了子目录。要填含 `package.json`、且带 `dsh.bundle.patch` 的那一层（仓库根目录）。 |
| 移动目录后插件列表里报错 | 本地安装登记的是 `link:` 依赖，目录移动或改名后就断了。把目录放回原处，或卸载后按新路径重装。 |
| 装好了但侧边栏没有入口 | 桌面版重启 Harness；`dsh web` 的话刷新页面。仍未出现时看「插件」页里该 bundle 的开关是否打开。 |
| 头部显示 `翻译服务未就绪` | 设置里没有选默认模型，或供应商暂时不可达。选好默认模型后刷新页面。 |
| 头部没有模型下拉框 | 只发现了一个可用路由，没有可切换的对象。编辑器上方会提示是哪个 provider 列举失败；也可以在插件配置里补 `models` 手工兜底。 |
| 提示 `当前模型不支持图片识别`（HTTP 422） | 当前模型不支持读图，换一个支持图片的模型。 |
| 导入 `.docx` 时提示浏览器无法解析 | 该浏览器没有 `DecompressionStream`。把文件另存为 `.txt`、`.md` 或 `.html` 再导入。 |
| 下载的 HTML 丢了样式和链接 | 这是预期行为：页面翻译的是文字，导出只保留段落。需要排版请保留原文件。 |
| 点 `新建翻译` 后以为文档没了 | 文档仍在历史里，页面只是切到空白表单；点头部文档入口切回去即可。 |
| 回退后想找回刚被覆盖的译文 | 回退前已把它存成 `回退前` 一条记录，再打开 `修改记录` 回退那一版即可。 |
| 清除浏览器数据后历史消失 | 历史和编辑只存在 `localStorage`，没有云端副本。 |

## 附录：接入 B 站 Index-Translate 模型

### 模型简介

[Index-Translate](https://index-translate.bilibili.com/?p=/site/translate.html&lang=zh) 是 B 站开源的机器翻译模型系列，该页面即在线演示。它跑在 vLLM 上，接口是标准的 OpenAI Chat Completions，可以当普通自定义提供方接进 Harness，接好后本插件头部就能选中它。

- `Index-Translate-35B-A3B`：旗舰版，MoE 结构（35B 总参数 / 3B 激活），多语种互译，还能直接读图翻译图片里的文字 —— 在本插件里就是翻译、重译、评分、识图全都能做。
- `Index-Translate-9B` / `Index-Translate-2B`：更小更快的纯文本翻译模型，适合量大、只要速度的场景。

演示服务不需要密钥，也不承诺 SLA，适合当试验路由。

### 方法一：Web UI 配置（推荐）

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

### 方法二：直接编辑配置文件

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

### 验证

重启 Harness（供应商注册发生在启动阶段），然后看本插件头部的模型下拉框：会多出一组 `bilibili-translate`，选中 `Index-Translate-35B-A3B` 就能用它翻译、重译、评分和识图。也可以直接查接口：

```bash
curl http://127.0.0.1:<端口>/dsh-translation/api/health
```

返回的 `models` 里出现 `provider: bilibili-translate` 的条目，即接入成功。

### 注意事项

- 公开演示部署：没有 SLA、没有公开的限流说明，也可能随时改版或下线。适合当试验路由，不适合放进生产链路。
- 35B 的上下文是 24,576 token，而本插件允许 12 万字符的文档。批量按 6 段 / 16 句切分，正常文章放得下，单个段落写到几万字就会超。用演示接口时建议把 `concurrency` 降到 `2`。
- 不要填真实密钥：接口根本不看它，而这个值会被存进本机凭据库。