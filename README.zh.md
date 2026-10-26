# 翻译助手（Translation Assistant）

一个 DeepSeek Harness 插件，把翻译者的角色从执笔转为审校：99% 的翻译工作由 AI 完成——文本、文件、截图直接交给模型处理，整个文件夹也能批量翻译并写回磁盘；剩下的 1% 是人工审核——在对照视图中审阅译文、修订个别措辞，其余修改由 AI 按评分与评语自动完成。所有数据仅保留在本机，模型可按请求切换。

[English](README.md)

**功能一览**

- **99% AI 翻译** —— 文本、文件、截图均由模型直接翻译；工作区支持整文件夹批量翻译并将结果写回磁盘。
- **1% 人工审核** —— 在对照视图中审阅译文，仅需修订需要调整的句子；AI 重译、评分与按评语重写均遵循你的指令。
- **双模型评审闭环** —— 一个模型产出初稿，另一个模型评分，评语一键转化为重写要求；每轮修改均保留可回滚的版本。
- **不只是页面，还是 Agent 工具** —— 同一引擎以 `translation_assistant`（`translate | retranslate | score | score_document`）在对话里直接调用。
- **本地优先** —— 历史与编辑不出浏览器，模型自带。

![逐段对照工作台：原文与译文左右并列，评分可见](https://raw.githubusercontent.com/coldgust/dsh-translation-assistant/main/docs/screenshots/workspace.png)

## 安装

终端一行命令：

```bash
dsh plugin --profile web add dsh-translation-assistant
```

或用图形界面：左侧栏「插件 → 添加插件」，填 `dsh-translation-assistant`，点「安装」再「立即启用」。

本地目录、Git 地址、手工登记，以及升级与卸载：见 [docs/install.zh.md](docs/install.zh.md)。

## 能做什么

### 翻译

- 「逐段对比」或「逐句对比」，两种粒度在同一次翻译里一起返回；速度优先模式按块并发，显示「翻译中 n/m」进度。
- 三种翻译模式，在新建翻译表单和全文视图里切换。响应与所选协议不符时自动回退为批量翻译，不会中断。

  | 模式 | 特点 | 适用场景 |
  | --- | --- | --- |
  | 连贯优先 | 全文一次请求，上下文最完整 | 文章、报告等；默认模式 |
  | 对齐优先 | 段落数组协议，段落一一对应最有保障 | 术语表、字幕、严格对照排版 |
  | 速度优先 | 分块 3 路并发，长文最快 | 限时处理大文档 |

- **整份文件** —— 拖入或选择 `.txt`、`.md`、`.log`、`.html`、`.htm`、`.docx`（Word 在浏览器里解包，原文件不上传）。
- **图片** —— 粘贴或选择截图，识别文字后直接翻译。

### 工作区

- 工作区直接引用 Harness 里的项目：抽屉顶部下拉列出主界面添加过的所有项目文件夹，选择即切换，上次使用的会被记住。文件读写都被限制在所选项目目录内；抽屉不会遮挡正在校对的内容。
- 宿主未提供项目列表时（如 `dsh web`），抽屉内可折叠展开手动输入路径的兜底入口；宿主侧尚未更新时（404）会提示重启 Harness。
- 目录树按文件夹折叠；单击文件名即可打开——未翻译的文件随即开始翻译，已翻译的直接进入校对。
- 译文输出到 `translated/` 子文件夹（默认）、同目录后缀副本、覆盖原文件，或只在页面上查看、不写入磁盘；`.docx` 的译文一律存成 `.md`。校对改动可开启自动保存，或手动保存。
- 「翻译全部」按顺序处理未翻译的文件并逐个写入磁盘；可随时停止，已写入的结果保留。查看工作区文件时，工作区按钮会显示所在项目的名字。
- 工作区下的 `.translation-spec/` 目录存放翻译规范文档（`glossary.md`、`style.md` 等），翻译、重译、评分等 AI 请求自动附带；抽屉里可查看、编辑、新增、删除。

![工作区抽屉：侧边的目录树、输出设置与批量翻译](https://raw.githubusercontent.com/coldgust/dsh-translation-assistant/main/docs/screenshots/workspace-drawer.png)

### 校对与打磨

- 原文与译文左右并列，每一段都能改，改句子会重拼段落、改段落会按句子边界拆回。
- 「AI 重译」重做单段，「提示词重译」可附上「更口语一些」这类要求；两者都跟随翻译模式，每次留一条修改记录。
- 评分按需开启：给单段、当前视图或整篇打分，再从工具栏统一显示。「按建议优化」把分数和评语作为要求重写该段；「全部优化」把评过分的段落批量重写，三个一批。
- 停止按钮总在进度旁边；在途请求被取消，已落地的改写保留。

### 留痕

- 本机历史 —— 最多 200 篇，支持搜索、置顶与快速删除。
- 修改记录 —— 每篇最多 100 份快照；抽屉标出每份与当前文本相差几段，回退本身也能撤销。

![翻译历史抽屉：搜索、置顶条目与片段数](https://raw.githubusercontent.com/coldgust/dsh-translation-assistant/main/docs/screenshots/history.png)

### 集成

- 头部下拉框按 provider 分组：「跟随默认模型」跟随档案设置，选其它条目则固定该路由用于翻译、重译、评分和识图。外部模型在 Harness 设置里接入，示例见 [docs/bilibili-index-translate.zh.md](docs/bilibili-index-translate.zh.md)。
- 同一套引擎也暴露成 `translation_assistant` Agent 工具（`translate | retranslate | score | score_document`），可以在对话里直接翻译或评审。

## 应用场景

**一个模型翻译，另一个评分优化。** 先用高速模型翻译，再切换至最强模型执行「全部评分」「全部优化」——每次重写都以分数和评语作为要求，强模型只修复它自己指出的问题；每轮均保留修改记录，对比与回退一键完成。

**一整份文档从头到尾。** 拖入 `.docx`、`.md` 或 `.html`，一次请求整份翻完，「下载译文」按原格式写回，空行分段结构保留。

![全文的对比模式：显示导入的文件名和下载译文按钮](https://raw.githubusercontent.com/coldgust/dsh-translation-assistant/main/docs/screenshots/full-text.png)

## 实现结构

`host/index.js` 注册同源的 `/dsh-translation/api` 路由和 Agent 工具，`host/engine.js` 负责模型调用（不依赖 Harness），`client.js` 是页面本体。POST 校验来源、上限 24 MiB，每个请求都可固定 `route: { provider, model }`。

接口明细、配置字段、本机存储、完整限制和维护提示：见 [docs/reference.zh.md](docs/reference.zh.md)。

## 隐私

历史、编辑和偏好都只留在浏览器里；只有被翻译、重译、评分或从图片中读出的文本会发送到模型路由。清除该站点的浏览器数据会丢失历史，服务端没有副本。

## 开发与验证

```bash
node --test 'test/*.test.mjs'
```

本目录就是已安装的 bundle：改 `client.js` 会被热替换到已打开的页面，宿主侧改动需重启 Harness。`docs/screenshots/` 里的截图是真实页面在 mock 数据下的渲染，界面改版后重拍。

## 常见问题

见 [docs/troubleshooting.zh.md](docs/troubleshooting.zh.md)。
