# 从源码安装、升级与卸载

主 README 介绍了一行命令安装（`dsh plugin --profile web add dsh-translation-assistant`）和 npm 包的图形界面装法，本页是其余方式，以及升级与卸载。

## 本地目录（改代码时用）

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

## Git 地址

不想在本地留副本时用。按本地目录的方式填 path 的那一步改成填仓库地址 `https://github.com/coldgust/dsh-translation-assistant.git`，其余相同。代价是代码被装进档案的 `node_modules`，改动不回流到仓库，升级只能卸载重装。

## 手工登记

喜欢文件配置或要脚本化时，改档案的 `package.json`（桌面版是 `~/.dsh/profiles/desktop/package.json`）。下面只列与本插件有关的两处，档案原有的 bundle 与依赖照旧保留。用 npm 上的版本：

```json
{
  "dsh": {
    "profile": {
      "bundles": ["dsh-translation-assistant"]
    }
  },
  "dependencies": {
    "dsh-translation-assistant": "^1.17.3"
  }
}
```

想指向本机目录的话，把依赖改成 `"link:/Users/you/code/dsh-translation"`。

然后在同一目录跑 `pnpm install` 并重启 Harness。`bundles` 数组里保留档案原有的条目，只在末尾追加这一行。档案的 `cordis.patch.yml` 不用动：插件行由本包自带的 patch 插入（`package.json` 的 `dsh.bundle.patch` → `cordis.patch.yml`）。

## 装好之后

- 「插件 → 已安装插件」里能看到「翻译助手」，开关打开，点进去能看到它自带的一行 `translation-assistant`。
- 页头若显示「翻译服务未就绪」，去「设置 → 模型」选一个默认模型，再刷新页面。
- 想接外部模型（例如[附录](bilibili-index-translate.zh.md)里的 B 站 Index-Translate），接好后头部下拉框里能直接选。

## 升级与卸载

| 方式 | 升级 | 卸载 |
| --- | --- | --- |
| npm 包 | 先在插件页卸载，再重装新版 | 插件页对该 bundle 点「卸载」 |
| 本地目录 | `git pull` 后刷新页面；宿主侧改动需要重启 | 同上 |
| Git 地址 | 先卸载再重装 | 同上 |
| 手工登记 | 换版本号后 `pnpm install`；本地目录则 `git pull` 后重启 | 删掉 `bundles` 与 `dependencies` 两处，再 `pnpm install` |
