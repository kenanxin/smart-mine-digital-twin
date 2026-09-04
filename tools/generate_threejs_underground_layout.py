from __future__ import annotations

from html import escape
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1600
HEIGHT = 1000
ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "competition_submission" / "figures"

COLORS = {
    "page": "#edf1f2",
    "paper": "#fbfcfc",
    "ink": "#26373d",
    "muted": "#667980",
    "line": "#c6d1d5",
    "grid": "#e4eaec",
    "road": "#65777d",
    "road_core": "#f8faf9",
    "equipment": "#328a5b",
    "sensor": "#e2a01f",
    "camera": "#2697bd",
    "person": "#7657a7",
    "risk": "#c9473f",
    "coal": "#293034",
}

ROADWAY_NODES = {
    "portal": {"name": "井口", "position": (260, 18, -45)},
    "h1-junction": {"name": "H1 交汇点", "position": (160, -45, -60)},
    "h1-level-end": {"name": "H1 水平端", "position": (250, -45, -10)},
    "h2-junction": {"name": "H2 交汇点", "position": (90, -95, -85)},
    "h3-junction": {"name": "H3 交汇点", "position": (20, -155, -110)},
    "pump-chamber": {"name": "泵房", "position": (190, -95, -10)},
    "substation-chamber": {"name": "变电所", "position": (10, -95, -10)},
    "intake-gate-end": {"name": "进风顺槽端", "position": (-30, -155, -45)},
    "return-gate-end": {"name": "回风顺槽端", "position": (-30, -155, -175)},
    "working-face-1206": {"name": "1206 工作面", "position": (-110, -155, -110)},
}

ROADWAY_EDGES = [
    ("main-incline-h1", "主斜井 H1", "portal", "h1-junction", [(260, 18, -45), (205, -12, -52), (160, -45, -60)]),
    ("main-incline-h2", "主斜井 H2", "h1-junction", "h2-junction", [(160, -45, -60), (125, -70, -72), (90, -95, -85)]),
    ("main-incline-h3", "主斜井 H3", "h2-junction", "h3-junction", [(90, -95, -85), (55, -125, -98), (20, -155, -110)]),
    ("main-level-h1", "H1 水平巷", "h1-junction", "h1-level-end", [(160, -45, -60), (205, -45, -35), (250, -45, -10)]),
    ("pump-descent", "泵房联络巷", "h1-level-end", "pump-chamber", [(250, -45, -10), (220, -70, -10), (190, -95, -10)]),
    ("main-level-h2", "H2 水平巷", "h2-junction", "substation-chamber", [(90, -95, -85), (50, -95, -45), (10, -95, -10)]),
    ("main-level-h3", "H3 水平巷", "h3-junction", "intake-gate-end", [(20, -155, -110), (5, -155, -75), (-30, -155, -45)]),
    ("return-airway", "回风大巷", "h1-junction", "substation-chamber", [(160, -45, -60), (85, -45, 15), (10, -95, -10)]),
    ("intake-gate-road", "进风顺槽", "intake-gate-end", "working-face-1206", [(-30, -155, -45), (-70, -155, -60), (-110, -155, -110)]),
    ("return-gate-road", "回风顺槽", "return-gate-end", "working-face-1206", [(-30, -155, -175), (-70, -155, -160), (-110, -155, -110)]),
    ("lower-gate-crosscut", "下部联络巷", "h3-junction", "return-gate-end", [(20, -155, -110), (-5, -155, -145), (-30, -155, -175)]),
    ("chamber-crosscut", "硐室联络巷", "pump-chamber", "substation-chamber", None),
    ("face-crosscut", "工作面切眼", "intake-gate-end", "return-gate-end", None),
]

GLOBAL_MONITORS = [
    ("RP-01", "sensor", "intake-gate-road", 0.20), ("RP-02", "sensor", "intake-gate-road", 0.62),
    ("RP-03", "sensor", "return-gate-road", 0.30), ("RP-04", "sensor", "return-gate-road", 0.72),
    ("DS-01", "sensor", "main-level-h3", 0.25), ("DS-02", "sensor", "lower-gate-crosscut", 0.55),
    ("CV-01", "sensor", "main-incline-h2", 0.50), ("CV-02", "sensor", "main-incline-h3", 0.50),
    ("MS-01", "sensor", "return-airway", 0.35),
    ("SR-01", "sensor-node", "working-face-1206", 0),
    ("JT-01", "sensor-node", "h1-junction", 0), ("JT-02", "sensor-node", "h2-junction", 0),
    ("JT-03", "sensor-node", "h3-junction", 0), ("CH-01", "sensor-node", "pump-chamber", 0),
    ("CH-02", "sensor-node", "substation-chamber", 0),
    ("CAM-01", "camera-node", "portal", 0), ("CAM-02", "camera-node", "h2-junction", 0),
    ("CAM-03", "camera-node", "h3-junction", 0), ("CAM-04", "camera-node", "working-face-1206", 0),
    ("PER-01", "person-node", "h1-junction", 0), ("PER-02", "person-node", "substation-chamber", 0),
    ("PER-03", "person-node", "working-face-1206", 0),
    ("EQ-STATE-01", "equipment-node", "working-face-1206", 0),
    ("EQ-STATE-02", "equipment-node", "pump-chamber", 0),
    ("EQ-STATE-03", "equipment-node", "substation-chamber", 0),
]

LOCAL_EQUIPMENT = [
    ("shearer", "采煤机", 2),
    ("supports", "液压支架（12 架）", 4),
    ("afc", "刮板输送机", 6),
    ("stage-loader", "转载机（1-12 m）", 10),
    ("crusher", "破碎机（14-19 m）", 16),
    ("belt", "带式输送机（21-50 m）", 35),
]

LOCAL_MONITORS = [
    ("roof-separation-01", "顶板离层仪 01", 4, "center"),
    ("roof-separation-02", "顶板离层仪 02", 10, "center"),
    ("roof-separation-03", "顶板离层仪 03", 16, "center"),
    ("convergence-01", "巷道收敛监测 01", 10, "left"),
    ("anchor-load-01", "锚索受力监测 01", 12, "right"),
    ("support-pressure-03", "支架压力 03", 4, "left"),
    ("microseismic-01", "微震监测 01", 18, "left"),
    ("cctv-01", "出口 CCTV 01", 2, "right-camera"),
]


def edge_points(edge):
    _, _, start, end, points = edge
    if points:
        return points
    return [ROADWAY_NODES[start]["position"], ROADWAY_NODES[end]["position"]]


def interpolate(points, mileage):
    scaled = max(0.0, min(1.0, mileage)) * (len(points) - 1)
    index = min(len(points) - 2, int(scaled))
    local = scaled - index
    return tuple(points[index][axis] + (points[index + 1][axis] - points[index][axis]) * local for axis in range(3))


def global_xy(position):
    x, _, z = position
    return 105 + (x + 120) / 390 * 790, 245 + (z + 185) / 210 * 570


def local_y(meter):
    return 265 + meter / 50 * 380


def font_path(bold=False):
    candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/simsun.ttc"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("No Chinese-capable system font was found")


def load_font(size, bold=False, scale=1):
    return ImageFont.truetype(str(font_path(bold)), size * scale)


def svg_text(x, y, text, size=20, color=None, weight=400, anchor="start", extra=""):
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color or COLORS["ink"]}" '
        f'font-weight="{weight}" text-anchor="{anchor}" {extra}>{escape(text)}</text>'
    )


def svg_marker(x, y, kind, label, data_attr):
    color = COLORS["sensor"]
    shape = f'<circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="{color}" stroke="#ffffff" stroke-width="2"/>'
    if "camera" in kind:
        color = COLORS["camera"]
        shape = f'<rect x="{x - 7:.1f}" y="{y - 5:.1f}" width="14" height="10" rx="2" fill="{color}" stroke="#ffffff" stroke-width="2"/>'
    elif "person" in kind:
        color = COLORS["person"]
        shape = f'<path d="M{x:.1f} {y - 7:.1f}l7 13h-14z" fill="{color}" stroke="#ffffff" stroke-width="2"/>'
    elif "equipment" in kind:
        color = COLORS["equipment"]
        shape = f'<rect x="{x - 6:.1f}" y="{y - 6:.1f}" width="12" height="12" transform="rotate(45 {x:.1f} {y:.1f})" fill="{color}" stroke="#ffffff" stroke-width="2"/>'
    return f'<g {data_attr}="{escape(label)}">{shape}</g>'


def render_svg(path):
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">',
        '<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif;letter-spacing:0}.small{font-size:15px}.label{font-size:17px;font-weight:600}</style>',
        f'<rect width="1600" height="1000" fill="{COLORS["page"]}"/>',
        f'<rect x="0" y="0" width="1600" height="118" fill="{COLORS["ink"]}"/>',
        svg_text(48, 61, "Three.js 井下设备与监测仪器布局图", 34, "#ffffff", 700),
        svg_text(49, 91, "UNDERGROUND ROADWAY · EQUIPMENT · MONITORING LAYOUT", 15, "#b9c7cb", 500),
        svg_text(1548, 59, "1206", 30, "#e7ae39", 700, "end"),
        svg_text(1548, 87, "工作面重点监测", 15, "#dbe4e7", 400, "end"),
        f'<rect x="40" y="142" width="950" height="808" rx="5" fill="{COLORS["paper"]}" stroke="{COLORS["line"]}"/>',
        f'<rect x="1010" y="142" width="550" height="612" rx="5" fill="{COLORS["paper"]}" stroke="{COLORS["line"]}"/>',
        f'<rect x="1010" y="774" width="550" height="176" rx="5" fill="{COLORS["paper"]}" stroke="{COLORS["line"]}"/>',
        svg_text(72, 188, "01  井下巷道网络与全局监测点", 23, COLORS["ink"], 700),
        svg_text(1042, 188, "02  1206 工作面局部放大", 23, COLORS["ink"], 700),
    ]

    for index in range(7):
        x = 95 + index * 135
        parts.append(f'<line x1="{x}" y1="218" x2="{x}" y2="855" stroke="{COLORS["grid"]}" stroke-width="1"/>')
    for index in range(6):
        y = 245 + index * 114
        parts.append(f'<line x1="72" y1="{y}" x2="958" y2="{y}" stroke="{COLORS["grid"]}" stroke-width="1"/>')

    for edge in ROADWAY_EDGES:
        edge_id, edge_name, _, _, _ = edge
        points = [global_xy(point) for point in edge_points(edge)]
        point_string = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
        parts.append(
            f'<g data-roadway-edge="{edge_id}"><polyline points="{point_string}" fill="none" stroke="{COLORS["road"]}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<polyline points="{point_string}" fill="none" stroke="{COLORS["road_core"]}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<title>{escape(edge_name)}</title></g>'
        )

    label_offsets = {
        "portal": (-12, -25, "end"), "h1-junction": (-18, -20, "end"), "h1-level-end": (12, -18, "start"),
        "h2-junction": (-16, -22, "end"), "h3-junction": (15, -23, "start"), "pump-chamber": (15, -15, "start"),
        "substation-chamber": (14, 42, "start"), "intake-gate-end": (-18, 34, "end"),
        "return-gate-end": (18, -28, "start"), "working-face-1206": (-2, 58, "middle"),
    }
    for node_id, node in ROADWAY_NODES.items():
        x, y = global_xy(node["position"])
        depth = node["position"][1]
        dx, dy, anchor = label_offsets[node_id]
        parts.append(
            f'<g data-roadway-node="{node_id}"><circle cx="{x:.1f}" cy="{y:.1f}" r="9" fill="{COLORS["ink"]}" stroke="#ffffff" stroke-width="3"/>'
            + svg_text(x + dx, y + dy, node["name"], 17, COLORS["ink"], 700, anchor)
            + svg_text(x + dx, y + dy + 20, f"标高 {depth:+d} m", 13, COLORS["muted"], 400, anchor)
            + "</g>"
        )

    edge_map = {edge[0]: edge for edge in ROADWAY_EDGES}
    monitor_offsets = [(9, -10), (9, 17), (-10, -11), (-10, 18)]
    for index, (monitor_id, kind, target, mileage) in enumerate(GLOBAL_MONITORS):
        if kind.endswith("node"):
            position = ROADWAY_NODES[target]["position"]
        else:
            position = interpolate(edge_points(edge_map[target]), mileage)
        x, y = global_xy(position)
        dx, dy = monitor_offsets[index % len(monitor_offsets)]
        parts.append(svg_marker(x, y, kind, monitor_id, 'data-global-monitor'))
        if "sensor" in kind or "camera" in kind:
            parts.append(svg_text(x + dx, y + dy, monitor_id, 11, COLORS["muted"], 600))

    parts.extend([
        f'<rect x="1038" y="218" width="494" height="500" rx="4" fill="#eef3f4" stroke="{COLORS["line"]}"/>',
        f'<rect x="1054" y="238" width="228" height="52" rx="3" fill="{COLORS["coal"]}"/>',
        svg_text(1168, 271, "煤壁 / 采煤工作面", 15, "#ffffff", 700, "middle"),
        f'<rect x="1072" y="300" width="192" height="394" rx="22" fill="#ffffff" stroke="{COLORS["road"]}" stroke-width="8"/>',
        f'<rect x="1082" y="444" width="172" height="48" fill="{COLORS["risk"]}" opacity="0.13"/>',
        svg_text(1168, 474, "14-19 m 风险区", 13, COLORS["risk"], 700, "middle"),
        svg_text(1308, 247, "仪器布点", 17, COLORS["ink"], 700),
        svg_text(1308, 270, "编号对应左侧安装位置", 12, COLORS["muted"], 400),
    ])

    equipment_layout = {
        "shearer": (1088, 336, 76, 26), "supports": (1088, 309, 160, 20), "afc": (1088, 370, 160, 13),
        "stage-loader": (1100, 402, 136, 19), "crusher": (1110, 453, 116, 27), "belt": (1157, 512, 22, 158),
    }
    equipment_short_labels = {
        "shearer": "采煤机", "supports": "液压支架 ×12", "afc": "AFC 刮板输送机",
        "stage-loader": "转载机", "crusher": "破碎机", "belt": "",
    }
    for equipment_id, label, _ in LOCAL_EQUIPMENT:
        x, y, w, h = equipment_layout[equipment_id]
        parts.append(
            f'<g data-equipment="{equipment_id}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="{COLORS["equipment"]}"/>'
            + (svg_text(x + w / 2, y + h / 2 + 5, equipment_short_labels[equipment_id], 9 if equipment_id == "afc" else 12, "#ffffff", 700, "middle") if equipment_short_labels[equipment_id] else "")
            + "</g>"
        )
    parts.append(svg_text(1190, 602, "带式输送机", 12, COLORS["equipment"], 700))
    parts.append(svg_text(1190, 620, "21-50 m", 12, COLORS["muted"], 500))

    monitor_positions = {
        "roof-separation-01": (1172, 343), "roof-separation-02": (1172, 385),
        "roof-separation-03": (1172, 437), "convergence-01": (1090, 385),
        "anchor-load-01": (1244, 407), "support-pressure-03": (1090, 322),
        "microseismic-01": (1090, 500), "cctv-01": (1244, 315),
    }
    monitor_notes = {
        "roof-separation-01": "4 m · 顶板中线", "roof-separation-02": "10 m · 顶板中线",
        "roof-separation-03": "16 m · 顶板中线", "convergence-01": "10 m · 两帮测线",
        "anchor-load-01": "12 m · 顶板锚索", "support-pressure-03": "出口第 3 架支架",
        "microseismic-01": "18 m · 左帮", "cctv-01": "2 m · 出口顶板",
    }
    for number, (monitor_id, label, _, side) in enumerate(LOCAL_MONITORS, start=1):
        x, y = monitor_positions[monitor_id]
        color = COLORS["camera"] if side == "right-camera" else COLORS["sensor"]
        parts.append(f'<g data-local-monitor="{monitor_id}">')
        parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="10" fill="{color}" stroke="#ffffff" stroke-width="2"/>')
        parts.append(svg_text(x, y + 4, str(number), 11, "#ffffff", 700, "middle"))
        row_y = 304 + (number - 1) * 48
        parts.append(f'<circle cx="1320" cy="{row_y - 5}" r="10" fill="{color}"/>')
        parts.append(svg_text(1320, row_y - 1, str(number), 11, "#ffffff", 700, "middle"))
        parts.append(svg_text(1340, row_y - 5, label, 13, COLORS["ink"], 700))
        parts.append(svg_text(1340, row_y + 13, monitor_notes[monitor_id], 11, COLORS["muted"], 400))
        parts.append("</g>")

    parts.extend([
        svg_text(1042, 803, "03  图例与编号说明", 21, COLORS["ink"], 700),
        f'<circle cx="1057" cy="842" r="7" fill="{COLORS["sensor"]}"/><rect x="1196" y="835" width="14" height="14" rx="2" fill="{COLORS["camera"]}"/>',
        f'<rect x="1338" y="835" width="14" height="14" transform="rotate(45 1345 842)" fill="{COLORS["equipment"]}"/>',
        f'<path d="M1477 835l8 14h-16z" fill="{COLORS["person"]}"/>',
        svg_text(1073, 848, "顶板/围岩仪器", 15, COLORS["ink"], 600),
        svg_text(1218, 848, "CCTV", 15, COLORS["ink"], 600),
        svg_text(1362, 848, "设备状态", 15, COLORS["ink"], 600),
        svg_text(1492, 848, "人员定位", 15, COLORS["ink"], 600),
        svg_text(1042, 886, "RP 顶板压力  ·  DS 离层  ·  CV 收敛  ·  MS 微震", 14, COLORS["muted"], 500),
        svg_text(1042, 912, "JT 交汇点应力  ·  CH 硐室压力  ·  SR 支架载荷", 14, COLORS["muted"], 500),
        svg_text(48, 980, "依据项目 Three.js 场景配置生成 · 示意布局，非矿井测绘施工图", 14, COLORS["muted"], 500),
        svg_text(1552, 980, "SMART MINE DIGITAL TWIN", 14, COLORS["muted"], 700, "end"),
        "</svg>",
    ])
    path.write_text("\n".join(parts), encoding="utf-8")


def render_png(path):
    scale = 2
    image = Image.new("RGB", (WIDTH * scale, HEIGHT * scale), COLORS["page"])
    draw = ImageDraw.Draw(image)

    def box(coords, fill, outline=None, radius=0, width=1):
        coords = tuple(int(value * scale) for value in coords)
        draw.rounded_rectangle(coords, radius=radius * scale, fill=fill, outline=outline, width=width * scale)

    def line(points, fill, width=1, joint="curve"):
        draw.line([(int(x * scale), int(y * scale)) for x, y in points], fill=fill, width=width * scale, joint=joint)

    def text_at(x, y, value, size=20, color=None, bold=False, anchor="la"):
        draw.text((x * scale, y * scale), value, font=load_font(size, bold, scale), fill=color or COLORS["ink"], anchor=anchor)

    def marker(x, y, kind):
        x *= scale
        y *= scale
        if "camera" in kind:
            draw.rounded_rectangle((x - 8 * scale, y - 6 * scale, x + 8 * scale, y + 6 * scale), radius=2 * scale, fill=COLORS["camera"], outline="#ffffff", width=2 * scale)
        elif "person" in kind:
            draw.polygon([(x, y - 8 * scale), (x + 8 * scale, y + 7 * scale), (x - 8 * scale, y + 7 * scale)], fill=COLORS["person"], outline="#ffffff")
        elif "equipment" in kind:
            draw.polygon([(x, y - 8 * scale), (x + 8 * scale, y), (x, y + 8 * scale), (x - 8 * scale, y)], fill=COLORS["equipment"], outline="#ffffff")
        else:
            draw.ellipse((x - 7 * scale, y - 7 * scale, x + 7 * scale, y + 7 * scale), fill=COLORS["sensor"], outline="#ffffff", width=2 * scale)

    draw.rectangle((0, 0, WIDTH * scale, 118 * scale), fill=COLORS["ink"])
    text_at(48, 63, "Three.js 井下设备与监测仪器布局图", 34, "#ffffff", True, "lm")
    text_at(49, 91, "UNDERGROUND ROADWAY · EQUIPMENT · MONITORING LAYOUT", 15, "#b9c7cb", False, "lm")
    text_at(1548, 59, "1206", 30, "#e7ae39", True, "rm")
    text_at(1548, 88, "工作面重点监测", 15, "#dbe4e7", False, "rm")
    box((40, 142, 990, 950), COLORS["paper"], COLORS["line"], 5)
    box((1010, 142, 1560, 754), COLORS["paper"], COLORS["line"], 5)
    box((1010, 774, 1560, 950), COLORS["paper"], COLORS["line"], 5)
    text_at(72, 188, "01  井下巷道网络与全局监测点", 23, bold=True, anchor="lm")
    text_at(1042, 188, "02  1206 工作面局部放大", 23, bold=True, anchor="lm")

    for index in range(7):
        x = 95 + index * 135
        line([(x, 218), (x, 855)], COLORS["grid"])
    for index in range(6):
        y = 245 + index * 114
        line([(72, y), (958, y)], COLORS["grid"])

    for edge in ROADWAY_EDGES:
        points = [global_xy(point) for point in edge_points(edge)]
        line(points, COLORS["road"], 18)
        line(points, COLORS["road_core"], 11)

    label_offsets = {
        "portal": (-12, -25, "ra"), "h1-junction": (-18, -20, "ra"), "h1-level-end": (12, -18, "la"),
        "h2-junction": (-16, -22, "ra"), "h3-junction": (15, -23, "la"), "pump-chamber": (15, -15, "la"),
        "substation-chamber": (14, 42, "la"), "intake-gate-end": (-18, 34, "ra"),
        "return-gate-end": (18, -28, "la"), "working-face-1206": (-2, 58, "ma"),
    }
    for node_id, node in ROADWAY_NODES.items():
        x, y = global_xy(node["position"])
        sx, sy = int(x * scale), int(y * scale)
        draw.ellipse((sx - 9 * scale, sy - 9 * scale, sx + 9 * scale, sy + 9 * scale), fill=COLORS["ink"], outline="#ffffff", width=3 * scale)
        dx, dy, anchor = label_offsets[node_id]
        text_at(x + dx, y + dy, node["name"], 17, bold=True, anchor=anchor)
        text_at(x + dx, y + dy + 20, f"标高 {node['position'][1]:+d} m", 13, COLORS["muted"], anchor=anchor)

    edge_map = {edge[0]: edge for edge in ROADWAY_EDGES}
    monitor_offsets = [(9, -10), (9, 17), (-10, -11), (-10, 18)]
    for index, (monitor_id, kind, target, mileage) in enumerate(GLOBAL_MONITORS):
        position = ROADWAY_NODES[target]["position"] if kind.endswith("node") else interpolate(edge_points(edge_map[target]), mileage)
        x, y = global_xy(position)
        marker(x, y, kind)
        dx, dy = monitor_offsets[index % len(monitor_offsets)]
        if "sensor" in kind or "camera" in kind:
            text_at(x + dx, y + dy, monitor_id, 11, COLORS["muted"], True, "la")

    box((1038, 218, 1532, 718), "#eef3f4", COLORS["line"], 4)
    box((1054, 238, 1282, 290), COLORS["coal"], radius=3)
    text_at(1168, 264, "煤壁 / 采煤工作面", 15, "#ffffff", True, "mm")
    box((1072, 300, 1264, 694), "#ffffff", COLORS["road"], 22, 8)
    draw.rectangle((1082 * scale, 444 * scale, 1254 * scale, 492 * scale), fill="#f6e8e6")
    text_at(1168, 468, "14-19 m 风险区", 13, COLORS["risk"], True, "mm")
    text_at(1308, 247, "仪器布点", 17, bold=True, anchor="la")
    text_at(1308, 270, "编号对应左侧安装位置", 12, COLORS["muted"], anchor="la")

    equipment_layout = {
        "shearer": (1088, 336, 76, 26), "supports": (1088, 309, 160, 20), "afc": (1088, 370, 160, 13),
        "stage-loader": (1100, 402, 136, 19), "crusher": (1110, 453, 116, 27), "belt": (1157, 512, 22, 158),
    }
    equipment_short_labels = {
        "shearer": "采煤机", "supports": "液压支架 ×12", "afc": "AFC 刮板输送机",
        "stage-loader": "转载机", "crusher": "破碎机", "belt": "",
    }
    for equipment_id, label, _ in LOCAL_EQUIPMENT:
        x, y, w, h = equipment_layout[equipment_id]
        box((x, y, x + w, y + h), COLORS["equipment"], radius=4)
        short_label = equipment_short_labels[equipment_id]
        if short_label:
            text_at(x + w / 2, y + h / 2, short_label, 9 if equipment_id == "afc" else 11, "#ffffff", True, "mm")
    text_at(1190, 602, "带式输送机", 12, COLORS["equipment"], True, "la")
    text_at(1190, 620, "21-50 m", 12, COLORS["muted"], anchor="la")

    monitor_positions = {
        "roof-separation-01": (1172, 343), "roof-separation-02": (1172, 385),
        "roof-separation-03": (1172, 437), "convergence-01": (1090, 385),
        "anchor-load-01": (1244, 407), "support-pressure-03": (1090, 322),
        "microseismic-01": (1090, 500), "cctv-01": (1244, 315),
    }
    monitor_notes = {
        "roof-separation-01": "4 m · 顶板中线", "roof-separation-02": "10 m · 顶板中线",
        "roof-separation-03": "16 m · 顶板中线", "convergence-01": "10 m · 两帮测线",
        "anchor-load-01": "12 m · 顶板锚索", "support-pressure-03": "出口第 3 架支架",
        "microseismic-01": "18 m · 左帮", "cctv-01": "2 m · 出口顶板",
    }
    for number, (monitor_id, label, _, side) in enumerate(LOCAL_MONITORS, start=1):
        x, y = monitor_positions[monitor_id]
        color = COLORS["camera"] if side == "right-camera" else COLORS["sensor"]
        sx, sy = int(x * scale), int(y * scale)
        draw.ellipse((sx - 10 * scale, sy - 10 * scale, sx + 10 * scale, sy + 10 * scale), fill=color, outline="#ffffff", width=2 * scale)
        text_at(x, y, str(number), 11, "#ffffff", True, "mm")
        row_y = 299 + (number - 1) * 48
        rx, ry = 1320 * scale, row_y * scale
        draw.ellipse((rx - 10 * scale, ry - 10 * scale, rx + 10 * scale, ry + 10 * scale), fill=color)
        text_at(1320, row_y, str(number), 11, "#ffffff", True, "mm")
        text_at(1340, row_y - 5, label, 13, COLORS["ink"], True, "la")
        text_at(1340, row_y + 13, monitor_notes[monitor_id], 11, COLORS["muted"], anchor="la")

    text_at(1042, 803, "03  图例与编号说明", 21, bold=True, anchor="lm")
    marker(1057, 842, "sensor")
    marker(1203, 842, "camera")
    marker(1345, 842, "equipment")
    marker(1477, 842, "person")
    text_at(1073, 842, "顶板/围岩仪器", 15, bold=True, anchor="lm")
    text_at(1218, 842, "CCTV", 15, bold=True, anchor="lm")
    text_at(1362, 842, "设备状态", 15, bold=True, anchor="lm")
    text_at(1492, 842, "人员定位", 15, bold=True, anchor="lm")
    text_at(1042, 886, "RP 顶板压力  ·  DS 离层  ·  CV 收敛  ·  MS 微震", 14, COLORS["muted"], anchor="lm")
    text_at(1042, 912, "JT 交汇点应力  ·  CH 硐室压力  ·  SR 支架载荷", 14, COLORS["muted"], anchor="lm")
    text_at(48, 980, "依据项目 Three.js 场景配置生成 · 示意布局，非矿井测绘施工图", 14, COLORS["muted"], anchor="lm")
    text_at(1552, 980, "SMART MINE DIGITAL TWIN", 14, COLORS["muted"], True, "rm")

    image = image.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    image.save(path, format="PNG", optimize=True)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    render_svg(OUTPUT_DIR / "threejs-underground-layout.svg")
    render_png(OUTPUT_DIR / "threejs-underground-layout.png")
    print(f"Generated layout figures in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
