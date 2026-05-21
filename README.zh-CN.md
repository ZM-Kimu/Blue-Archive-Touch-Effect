<div align="center">

# 碧蓝档案光标触控效果

[English](./README.md) | [中文](./README.zh-CN.md)

<br />

<img src="./assets/cursor-demo.gif" alt="光标触控效果展示" width="720" />

只是一个简单的 shader 效果，适用于 Web Canvas。

</div>



## 快速开始

安装依赖并启动测试页面：

```bash
npm install
npm run dev
```

构建项目：

```bash
npm run build
```

## 使用NPM包

```bash
npm install blue-archive-touch-effect
```

```ts
import { createClickFx } from 'blue-archive-touch-effect'

const target = document.querySelector<HTMLElement>('#fx-root')

if (!target) {
  throw new Error('Missing target element')
}

const fx = createClickFx({ target })
```

运行时会向 `target` 添加覆盖画布。如果目标元素是静态定位，运行时会临时设置为 `position: relative`，并在 `dispose()` 时恢复。

## 运行时 API

```ts
const fx = createClickFx({
  target,
  listenTarget,
  config,
  pixelRatioCap,
  autoBindPointer,
})

fx.spawnAtClient(clientX, clientY)
fx.spawnAtLocal(x, y)
fx.spawnClickAtClient(clientX, clientY)
fx.spawnClickAtLocal(x, y)
fx.beginTrailAtClient(pointerId, clientX, clientY)
fx.appendTrailAtClient(pointerId, clientX, clientY)
fx.beginTrailAtLocal(pointerId, x, y)
fx.appendTrailAtLocal(pointerId, x, y)
fx.endTrail(pointerId)
fx.endAllTrails()
fx.updateConfig(partialConfig)
fx.resize()
fx.dispose()
```

### 创建参数

- `target`：必填，覆盖画布挂载的宿主元素。
- `listenTarget`：可选，用于监听 pointer 输入的元素或 `window`。
- `config`：可选，运行时配置补丁。
- `pixelRatioCap`：可选，设备像素比上限，默认 `2`。
- `autoBindPointer`：为 `true` 时，运行时自动绑定点击和滑动 pointer 事件。

### 手动触发

默认运行时会接管 pointer 输入。如果应用希望自己决定 click burst 或 trail 的开始、移动和结束时机，可以设置 `autoBindPointer: false`。

```ts
const fx = createClickFx({
  target,
  autoBindPointer: false,
})

target.addEventListener('pointerdown', (event) => {
  fx.spawnClickAtClient(event.clientX, event.clientY)
  fx.beginTrailAtClient(event.pointerId, event.clientX, event.clientY)
})

target.addEventListener('pointermove', (event) => {
  if (event.buttons > 0 || event.pointerType === 'touch') {
    fx.appendTrailAtClient(event.pointerId, event.clientX, event.clientY)
  } else {
    fx.endTrail(event.pointerId)
  }
})

target.addEventListener('pointerup', (event) => {
  fx.endTrail(event.pointerId)
})

window.addEventListener('blur', () => {
  fx.endAllTrails()
})
```

## 配置示例

```ts
fx.updateConfig({
  arc: {
    color: { r: 0x4C / 255, g: 0xA7 / 255, b: 1 },
  },
  swipe: {
    trail: {
      minVertexDistance: 0.02,
      startColor: { r: 0, g: 0x64 / 255, b: 1 },
      midColor: { r: 0, g: 0x64 / 255, b: 1 },
      endColor: { r: 0, g: 0x64 / 255, b: 1 },
      alpha: {
        start: 1,
        mid: 1,
        end: 0,
        midTime: 0.6,
      },
    },
  },
  mixer: {
    mode: 'screen',
    trailWeight: 1,
  },
  postfx: {
    bloom: {
      enabled: true,
      threshold: 0.93,
      intensity: 1.65,
    },
  },
})
```

`updateConfig(...)` 会按 section 深度合并配置，因此只需要传入要修改的字段。

## 引用

- 点击效果参照：[Blue Archive touch fx process](https://www.youtube.com/watch?v=Ho7BbVUr71Q)。
- 拖尾效果参照：游戏实际反编译内容。

## License

本项目使用 MIT License，见 [LICENSE](./LICENSE)。
