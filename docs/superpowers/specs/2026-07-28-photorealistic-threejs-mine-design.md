# 写实智慧煤矿 Three.js 场景设计

## 1. 目标与阶段边界

第一阶段在 `smart-mine-digital-twin` 原项目上原位升级中央 Three.js 场景，交付一个小型但完整、可实时浏览的井下煤矿工作区。视觉目标以用户提供的太极/飞渡智慧矿山场景为基准，重点对齐真实尺度、岩煤表面、磨损金属、局部暖色矿灯、粉尘雾和密集有序的工业设施。

第一阶段保留原大屏布局、地上场景、五类灾害按钮和现有业务接口，不优先重做传感器字段、ECharts 曲线和告警数据。第二阶段再完成顶板数据、图表、告警与三维状态的完整联动。

不使用 AirCity、太极播放器或 `.3dt` 转换，不出现太极水印。最终运行时为纯 Three.js Web 渲染。

## 2. 场景空间设计

地下场景采用紧凑的双巷闭环布局：

- 主运输巷：轨道、电机车、矿车、皮带输送机和转载节点的主要动线。
- 回风巷：风筒、管线、人员巡检通道和回风设施。
- 两条联络巷：形成完整闭环，避免只有两横一竖或蛇形巷道。
- `1206 工作面`：布置煤壁、顶板、局部采空区、液压支架阵列、采煤机或掘进机、刮板输送机和转载设备。
- 辅助设施：轨道、锚杆锚网、钢拱支护、电缆、排水管、照明、安全标识、摄像头和监测点。

默认井下镜头位于主运输巷进入工作面的视角，首次进入即可看到岩壁、支护、设备和照明层次。地上/井下切换使用独立相机预设和可见性状态，修复原项目切换到井下后画布空白的问题。

## 3. 资产策略

### 3.1 外部资产

正式资产只采用许可证可核验且允许修改、商业使用和项目分发的素材。优先候选如下：

| 用途 | 资产 | 作者 | 许可 | 处理要求 |
| --- | --- | --- | --- | --- |
| 真实巷道轮廓 | [Ferriere Mines - Lower Tunnels](https://sketchfab.com/3d-models/ferriere-mines-lower-tunnels-17ba7a7ddbfb4d17a86ea1b405c9f5ea) | Riccardo Rocca | CC BY 4.0 | 切段、重拓扑、降面、烘焙法线 |
| 采掘设备 | [PK-3R Roadheader](https://sketchfab.com/3d-models/pk-3r-roadheader-e89ca2fe0f9f41b88780632269de9e30) | almapalinka | CC BY 4.0 | 降面并拆分切割头和履带节点 |
| 输送系统 | [Quarry Conveyor system Kit](https://sketchfab.com/3d-models/quarry-conveyor-system-kit-badf50e9d6ea47ac814e1cae037799ed) | Dumokan Art | CC BY 4.0 | 统一尺寸、材质和模块接口 |
| 井下牵引 | [Narrow gauge electric locomotive](https://sketchfab.com/3d-models/narrow-gauge-electric-locomotive-9863ce9aa4c449758a304a92dbb03d6f) | Lyskilde | CC BY 4.0 | 调整轮距、材质和车灯 |
| 矿车 | [Mine cart Rusted](https://sketchfab.com/3d-models/mine-cart-rusted-0b391322171c449fa0eb9092416fd2a6) | Gustavo Simas | CC BY 4.0 | 实例化成列并绑定轨迹 |
| 通风系统 | [Modular Ventilation Duct Kit Free](https://sketchfab.com/3d-models/modular-ventilation-duct-kit-free-d4e35aa0424a43ec9f34d7f8341236a0) | AMMediaGames | CC BY 4.0 | 改为矿用阻燃风筒材质 |
| 工业附件 | [Industrial asset pack](https://sketchfab.com/3d-models/industrial-asset-pack-free-94c5011772a84e8791779b342467f245) | ForevereQ | CC BY 4.0 | 筛选管路、阀门和工业小件 |
| 摄像头 | [Weathered CCTV Security Camera](https://sketchfab.com/3d-models/weathered-cctv-security-camera-rigged-256f864b503d4ff9becbb08d1f51dee7) | garwiglino1 | CC BY 4.0 | 保留转向骨架并加入点选标签 |
| 巡检人员 | [Low-Poly Construction Workers](https://sketchfab.com/3d-models/low-poly-construction-workers-animated-7b62e6e1b58c476f8b421dd007a4ff90) | Jungle Jim | CC BY 4.0 | 仅用于中远景，修改矿工配色和装备 |

岩壁、地面和设备材质使用 Poly Haven CC0 资源，包括 Dark Rock 02、Quarry Wall、Rock Face 03、Rock Ground、Blue Metal Plate、Metal Plate 02、Rust Coarse 01、Metal Grate Rusty 和 Rusty Painted Metal。

每项实际采用的资源必须登记到 `ASSET_LICENSES.md`，记录原始 URL、作者、许可证、下载日期、原始格式和修改内容。

### 3.2 定制资产

公开搜索未找到同时满足真实度、可下载性、Web 性能和清晰许可的液压支架及双滚筒采煤机。两项资产依据公开产品结构资料在 Blender 中定制建模：

- 液压支架拆分顶梁、掩护梁、底座、前后连杆和液压立柱，优化后以实例化方式排列 12-18 架。
- 双滚筒采煤机拆分机身、摇臂和滚筒，支持沿工作面往复及滚筒旋转。

定制模型必须使用真实工业比例和曲面结构，不以纯色 BoxGeometry 代替。

## 4. 资产加工流水线

1. 从原始许可页面下载官方归档，不抓取预览器缓存或绕过登录限制。
2. 在 Blender 中统一为米制、Y 轴向上、正前方为 -Z，并清理隐藏物体和重复材质。
3. 对扫描模型进行切段、重拓扑和法线烘焙；对设备拆分可运动部件并设置稳定原点。
4. 统一 PBR 材质命名，合并重复纹理，按用途输出 1K/2K 贴图；主视觉设备最多使用少量 4K 源图后下采样。
5. 导出 GLB，并使用 Meshopt/Draco 和 KTX2 压缩。
6. 逐个模型进行尺寸、包围盒、面数、材质、动画节点和许可证检查。

建议预算：井下主视野同时可见三角面控制在约 80-150 万以内，单个主设备优化到约 8-15 万面，重复支架、轨枕和矿车使用实例化，纹理显存控制在目标设备可接受范围内。

## 5. Three.js 架构

`js/scene.js` 保留对外入口，但内部按职责拆分：

- `scene/core.js`：渲染器、相机、控制器、尺寸变化和主循环。
- `scene/asset-registry.js`：资产 URL、许可元数据、加载状态和缓存。
- `scene/asset-loader.js`：GLTF、Draco、KTX2、错误回退和加载进度。
- `scene/mine-layout.js`：双巷闭环、工作面、地上/井下可见性和镜头预设。
- `scene/equipment-animation.js`：人员、电机车、矿车、采掘设备和输送系统动画。
- `scene/interaction.js`：射线拾取、悬停标签、摄像头和监测点。
- `scene/effects.js`：粉尘、雾、矿灯、风险覆盖层及后续灾害特效接口。

现有 `main.js` 和 `disaster.js` 继续通过稳定的导出函数调用场景，不直接访问模型内部节点。

## 6. 写实渲染标准

- 使用物理正确灯光、ACES Filmic 色调映射和 sRGB 输出。
- 主体由局部暖色矿灯照明，设备状态灯和大屏环境提供少量冷色对比。
- 采用高质量阴影、环境光遮蔽、距离雾、局部粉尘粒子和克制的 Bloom。
- 岩壁和煤壁同时具有颜色、粗糙度、法线、AO 和位移/视差层次，禁止大面积纯色表面。
- 金属设备通过粗糙度变化、边缘磨损、锈蚀和煤尘遮罩呈现使用痕迹。
- 镜头高度与人员尺度一致，默认视角不使用过度俯视，避免玩具模型感。
- 工业设施密集但不杂乱，管线、风筒、轨道、标识和照明遵循可解释的布置逻辑。

## 7. 动态与交互

- 一名或多名人员沿规定通道循环巡检。
- 窄轨电机车牵引矿车沿主运输巷运行，并在端点缓动折返。
- 采煤机或掘进机在工作面限定范围内往复，切割头持续旋转。
- 输送带使用纹理偏移或分段物料运动表示运行状态。
- 摄像头和监测点支持悬停与点击标签。
- 保留原五类灾害回调接口；第一阶段只保证接口不回归，顶板完整数据联动放到第二阶段。

## 8. 错误处理与降级

- 资产加载失败时记录具体 URL 和错误，并显示局部加载状态，不允许整个画布变空。
- 关键资产缺失时使用明确标记的低复杂度占位模型，仅用于开发诊断，不进入最终截图和交付。
- WebGL、压缩纹理或后处理能力不足时逐级关闭 Bloom、AO、阴影分辨率和粒子数量，保留主体场景。
- 地上/井下切换过程中阻止重复触发，并在切换完成后验证相机、目标点和可见组状态。

## 9. 验证与验收

功能验证：

- 地上/井下切换连续执行不少于 10 次，画布始终非空。
- 人员、车辆和至少一种采掘/运输设备持续运动。
- 原五类灾害按钮和恢复按钮仍可调用，不产生控制台异常。
- 资产加载失败能够局部降级并给出可诊断信息。

视觉验证：

- 在桌面 1920x1080、1366x768 及窄屏视口截图检查首屏取景。
- 检查画布像素非空、主体占比合理、灯光与雾层次可辨、文字和控制不重叠。
- 与太极/飞渡参考图逐项对比岩煤质感、金属磨损、矿灯氛围、设施密度、真实尺度和镜头高度。
- 不接受纯方块巷道、大片纯色材质、模型悬浮、重复纹理尺度失真或过度发光。

性能验证：

- 目标桌面设备在 1080p 大屏布局下保持稳定交互，首屏加载有明确进度。
- 记录模型体积、首屏加载时间、可见三角面、纹理尺寸和平均帧率。
- 若画质与性能冲突，优先保留主工作面、岩煤材质和设备质感，降低远景 LOD、阴影和粒子成本。

## 10. 第二阶段接口边界

第一阶段预留但不完成以下内容：顶板离层、下沉、支架阻力、锚索载荷、微震能量和顶板压力的统一模拟数据源；三维点位、数字卡片、ECharts 和告警列表联动；“压力异常到垮落再恢复”的完整状态机。第二阶段通过稳定场景 API 驱动风险颜色、支架姿态、镜头和灾害特效，无需重写场景资产体系。
