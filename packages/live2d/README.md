# @plugin-live2d/live2d

`packages/live2d` 是 plugin-live2d 的现代化前端实现，负责：

- 提供独立的 Live2d runtime 与组件入口
- 提供 Halo 场景下的自动引导入口
- 管理提示语合并逻辑与工具栏能力

## 开发命令

在仓库根目录执行：

```bash
pnpm --dir packages/live2d dev
pnpm --dir packages/live2d build
pnpm --dir packages/live2d check
```

其中：

- `dev`：启动 Vite 开发服务器
- `build`：先同步自定义工具动作定义，再构建库产物与 Halo 入口产物
- `check`：执行 Biome 检查，并在构建前同步自定义工具动作定义

## 构建产物

`build` 会生成两类产物：

- `dist/lib/live2d.js` / `dist/lib/live2d.umd.cjs`：独立运行时库入口，对应 `src/index.ts`
- `dist/live2d.js`：Halo 插件使用的前端入口，对应 `src/halo.ts`

Halo 后台开启“前端调试模式”后，会直接从本地 Vite 服务加载 `/@vite/client` 与 `/src/halo.ts`，用于联调现代化前端实现。

## 提示语（Tips）说明

当前 Tips 不再依赖旧版 `static` 目录中的前端脚本实现，现代化前端的默认提示语内置在：

```text
src/libs/live2d-tips.json
```

运行时会按下面的顺序合并提示语：

1. 内置默认 Tips（完整结构）
2. 主题 Tips（仅补充 `mouseover` / `click`）
3. 插件设置里的选择器提示语与事件提示语

如果 Halo 后台配置了“自定义提示语文件”，则会优先把它当作完整 Tips 文件加载；只有在文件缺失、格式不合法或加载失败时，才会回退到内置默认 Tips。

## 自定义工具

右侧工具栏现在支持通过 Halo 后台声明式扩展，无需注入自定义 JavaScript。

当前已支持的动作类型：

- `send-message`
- `widget-visibility`
- `toggle-chat`
- `switch-model`
- `switch-texture`
- `screenshot`
- `open-url`
- `emit-event`
- `load-model`

动作定义来自 `src/live2d/tools/custom-tool-actions/actions/*`，并通过下面的脚本自动生成类型与注册表：

```bash
pnpm --dir packages/live2d sync:custom-tool-actions
```

新增动作后，需要同步更新生成文件，再执行构建。

## 相关入口

- `src/index.ts`：独立库入口
- `src/halo.ts`：Halo 页面自动引导入口
- `src/halo-config.ts`：读取服务端注入配置
- `src/components/Live2dTools.tsx`：预设工具与自定义工具装配
- `src/helpers/loadMergedTips.ts`：Tips 合并逻辑
