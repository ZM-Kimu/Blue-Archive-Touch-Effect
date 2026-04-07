# Click FX Current Spec

这份文档不再描述“理想中的反推节点图”，而是记录**当前代码真实实现**。

目标是让后续继续迭代时，文档、面板、shader 行为三者保持一致。

## 1. 交互与调试语义

- 页面 `pointerdown` 会生成一次 burst。
- 大多数生成型参数在**下一次点击**生效。
- 以下内容是**立即生效**的：
  - 分支可见性
  - `Branch B` / `Branch D` 的 preview selector
  - `A7` 颜色
  - `C1` 参数
  - `Filter` 参数
  - `D8` 的 `Alpha Max / Alpha Min`
  - `D9` 参数
- 当前实现中，`Branch B` 和 `Branch D` 的 preview selector 不只是“检查用预览”，它们会直接替换该 branch 在最终画面中的输出。
  - 默认值已经设置为最终希望的阶段：
    - `CoreDisk = B4`
    - `Fragments = D8`

## 2. 当前总流程

```text
Branch A = MainArc
Branch B = CoreDisk
Branch C = Composite(MainArc, CoreDisk)
Branch D = Fragments
FinalFX = Composite(MainFX, Fragments)
FX = PostProcess(FinalFX, bloom + blur, blend = screen)
```

更准确地说，当前代码是：

```text
MainArc   = A7
CoreDisk  = B4           # 默认 preview
MainFX    = C1
Fragments = D8           # 默认 preview
FinalFX   = MainFX + Fragments
FX        = Screen(FinalFX, Bloom(Blur(FinalFX)))
```

## 3. Branch A: MainArc

### A1

```text
A1 = EllipsePrefab(
    radius = 0.10,
    scale_x = 0.09,
    scale_y = 1.00
)
```

### A2

```text
A2 = Animate(
    input = A1,
    duration = 0.70,
    movement_y = -0.20,
    movement_animation = ease-in-out,
    scale_to = 0,
    scale_animation = ease-in
)
```

说明：

- `movement_y` 使用 `ease-in-out`
- 缩放衰减使用 `ease-in`
- `duration` 会按粒子随机缩放一起缩放
- 位移距离也会按粒子随机缩放一起缩放

### A3

```text
A3 = Particleize(
    input = A2,
    random_x = 0.01,
    random_y = 0.08,
    scale_min = 0.53,
    scale_max = 1.00,
    min_count = 2,
    max_count = 3
)
```

说明：

- 每次点击生成 `2~3` 个实例
- A3 使用 burst 内预计算包围盒参与后续 polar warp

### A4

```text
A4 = PolarWarp(
    input = A3,
    angle_span_deg = 360,
    radius = 0.177
)
```

说明：

- 当前实现已改成按 burst 预计算边界，不再使用固定 `warpHalfHeight`

### A5 / A6 / A7

```text
A5 = FlipX(A4)

A6 = Rotate(
    input = A5,
    angular_speed_deg = -90
)

A7 = Colorize(
    input = A6,
    color = [0.18, 0.87, 1.00]
)
```

说明：

- `A6` 当前是**恒定角速度旋转**
- 它不是 `0 -> angle` 的一次性插值
- 旋转中心是点击点
- `A7` 当前没有单独 emission 参数，只有颜色

### Branch A 输出

```text
MainArc = A7
```

## 4. Branch B: CoreDisk

### B0

```text
B0 = CircleHeight(
    radius = 0.180,
    softness = 1.00
)
```

说明：

- `B0` 是中心亮、边缘暗的径向 height map
- 它是 helper，也可以通过 preview selector 单独查看

### B1

```text
B1 = SolidCircle(
    radius = 0.175
)
```

### B2

```text
B2 = ScaleAnimation(
    input = B1,
    start_scale = 0.25,
    end_scale = 1.00,
    time_fraction = 0.30,
    method = ease-out
)
```

说明：

- B2 在 burst 生命周期前 `30%` 内完成放大
- 之后保持 `1.00`

### B3

```text
B3 = GrayAlphaFromSequence(
    input = B2,
    gray_seq = B0[Seq],
    alpha_seq = B0[Seq],
    gray_mult = 1.23,
    alpha_mult = 0.54
)
```

说明：

- 当前实现不是“径向 reveal”
- `B0` 被当作一条从中心到边缘的 1D 序列
- 这条序列随时间采样，再统一作用到整个 `B2`

### B4

```text
B4 = ReplaceColor(
    input = B3,
    color = #4FB7FF,
    alpha = 1.00
)
```

### Branch B 默认输出

```text
CoreDisk = B4
```

## 5. Branch C: Main Composite

### C0

```text
C0 = Composite(
    layers = [CoreDisk, MainArc],
    blend = add
)
```

### B -> A handoff policy

```text
start Branch A when Branch B scale reaches 100%
```

当前代码中的语义：

- `CoreDisk` 点击后立刻开始
- `MainArc` 不会立刻开始
- `MainArc` 整条时间线会后移到 `B2` 完成放大之后
- A 分支不会压缩，只会整体后移

### C1

```text
C1 = AnimateScale(
    input = C0,
    start_scale = 0.20,
    end_scale = 1.00,
    time_fraction = 0.85,
    method = ease-out
)
```

说明：

- `C1` 是对整个 `C0` 做后置缩放
- 缩放中心是点击点

### Branch C 输出

```text
MainFX = C1
```

## 6. Branch D: Fragment Particles

### D0 / D1 / D2

```text
D0 = TriangleShape(size = 0.53)
D1 = FlipY(D0)
D2 = ParticleSprites([D0, D1])
```

### D3 / D4

```text
D3 = DonutShape(
    outer_radius = 0.203,
    inner_radius = 0.098
)

D4 = ParticleDistributionMap(D3)
```

### D5

```text
D5 = ParticleSystem(
    sprites = D2,
    distribution = D4,
    type = burst,
    direction = from_center,
    count = 4,
    speed = 0.04 ~ 0.08,
    lifetime = 0.38 ~ 0.60,
    size_random = 0.74 ~ 1.39,
    random_rotation = true
)
```

说明：

- 粒子出生点从 donut 区域内做面积正确采样
- 每个粒子随机选择正三角或倒三角 sprite

### D6

```text
D6 = ScaleOverLifetime(
    input = D5,
    start_scale = 0.00,
    peak_scale = 1.00,
    end_scale = 0.00,
    grow_fraction = 0.15
)
```

说明：

- 前 `15%` 生命周期从 `0 -> 1`
- 后续从 `1 -> 0`

### D7

```text
D7 = ColorOverLifetime(
    input = D6,
    target_color = #75E2FF,
    policy = per_particle,
    timing = complete_when_scale_reaches_peak
)
```

### D8

```text
D8 = AlphaOverLifetime(
    input = D7,
    alpha_max = 1.00,
    alpha_min = 0.35,
    flash_period_min = 0.07,
    flash_period_max = 0.15,
    policy = per_particle_flash,
    timing = start_when_scale_reaches_peak
)
```

说明：

- 每个粒子会随机得到自己的 flash 周期
- 达到 D6 峰值前，alpha 保持 `alpha_max`
- 达到峰值后，在 `alpha_max` 和 `alpha_min` 之间持续闪动

### D9

```text
D9 = InitScale(
    input = D8,
    start_scale = 0.85,
    end_scale = 1.10,
    time_fraction = 0.30,
    method = ease-out,
    policy = full_D8
)
```

说明：

- `policy = full_D8`
- 当前实现已经不是 per-particle
- 它对整组 D8 结果做统一 init scale

### Branch D 默认输出

```text
Fragments = D8
```

说明：

- `D9` 已实现
- 但当前默认最终输出仍然使用 `D8`
- 如果手动把 preview selector 切到 `D9`，最终画面也会切过去

## 7. Final

```text
FinalFX = Composite(
    layers = [MainFX, Fragments],
    blend = add
)
```

当前默认等价于：

```text
FinalFX = MainFX + D8
```

## 8. Filter

当前实现为独立 post-process pass，而不是把 bloom/blur 写进主 shader。

```text
FX = Composite(
    FinalFX,
    bloom,
    blur,
    blend = screen
)
```

当前默认值：

```text
Blur Radius      = 1.85
Blur Mix         = 0.60
Bloom Low        = 0.10
Bloom High       = 0.74
Bloom Intensity  = 1.48
Screen Mix       = 1.00
```

说明：

- `Filter` 有独立开关
- 关闭后直接旁路 post-process，只显示原始 `FinalFX`

## 9. 当前默认状态汇总

### Final output defaults

```text
Core preview     = B4
Fragment preview = D8
Filter           = enabled
```

### Current effect summary

```text
MainArc:
  ellipse prefab -> upward eased motion/shrink -> 2~3 instances ->
  polar warp -> flip x -> constant rotation -> cyan color

CoreDisk:
  height helper -> solid disk -> scale in -> sequence-driven gray/alpha -> blue replace

MainFX:
  CoreDisk starts immediately
  MainArc waits until Branch B scale reaches 100%
  then both are additively composited and scaled as one

Fragments:
  donut-distributed triangle burst ->
  scale over lifetime -> cyan color over lifetime ->
  flashing alpha over lifetime

Final:
  MainFX + Fragments
  then bloom + blur + screen
```

## 10. 后续修改原则

以后如果继续推进文档和代码，优先遵守这三个原则：

1. `design.md` 写“当前真实行为”，不是写“可能的理想图”。
2. 如果 preview selector 会改变最终输出，文档必须明确写出来。
3. 新增阶段时，要同时更新：
   - 文档里的 stage 链路
   - 默认输出阶段
   - 面板默认值
   - 是否为 next-click 生效或 immediate 生效
