from __future__ import annotations

import base64
import json
import math
from html import escape
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
GENERATED_DIR = ROOT / "tools" / ".generated"
FIGURE_DIR = ROOT / "competition_submission" / "figures"
DATA_PATH = GENERATED_DIR / "project-roadway-layout.json"
SOURCE_PATH = GENERATED_DIR / "project-roadway-source.png"

WIDTH = 1600
HEIGHT = 1000
COLORS = {
    "page": "#edf1f2",
    "paper": "#fbfcfc",
    "ink": "#26373d",
    "muted": "#667980",
    "line": "#c6d1d5",
    "grid": "#e3e9eb",
    "road": "#64767c",
    "road_core": "#f7f9f9",
    "equipment": "#328a5b",
    "sensor": "#e29a16",
    "camera": "#258fb4",
    "risk": "#c9473f",
    "dark": "#15242a",
}

NODE_NAMES = {
    "portal": "井口",
    "h1-junction": "H1 交汇点",
    "h1-level-end": "H1 水平端",
    "h2-junction": "H2 交汇点",
    "h3-junction": "H3 交汇点",
    "pump-chamber": "泵房",
    "substation-chamber": "变电所",
    "intake-gate-end": "进风顺槽端",
    "return-gate-end": "回风顺槽端",
    "working-face-1206": "1206 工作面",
}


def font_path(bold: bool = False) -> Path:
    candidates = [
        Path("C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/simsun.ttc"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("No Chinese-capable system font was found")


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(font_path(bold)), size)


def svg_text(x, y, value, size=20, color=None, weight=400, anchor="start"):
    return (
        f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{color or COLORS["ink"]}" '
        f'font-weight="{weight}" text-anchor="{anchor}">{escape(str(value))}</text>'
    )


def load_data():
    if not DATA_PATH.exists() or not SOURCE_PATH.exists():
        raise FileNotFoundError("Run the roadway exporter and capture script before rendering figures")
    return json.loads(DATA_PATH.read_text(encoding="utf-8")), Image.open(SOURCE_PATH).convert("RGB")


def vec_sub(a, b):
    return [a[index] - b[index] for index in range(3)]


def vec_dot(a, b):
    return sum(a[index] * b[index] for index in range(3))


def vec_cross(a, b):
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]


def vec_normalize(value):
    length = math.sqrt(vec_dot(value, value))
    return [axis / length for axis in value]


def project_monitor(position, camera, viewport=(1600, 1000)):
    camera_position = camera["position"]
    forward = vec_normalize(vec_sub(camera["target"], camera_position))
    right = vec_normalize(vec_cross(forward, [0, 1, 0]))
    up = vec_cross(right, forward)
    relative = vec_sub(position, camera_position)
    depth = vec_dot(relative, forward)
    tangent = math.tan(math.radians(camera["fov"]) / 2)
    aspect = viewport[0] / viewport[1]
    ndc_x = vec_dot(relative, right) / (depth * tangent * aspect)
    ndc_y = vec_dot(relative, up) / (depth * tangent)
    return ((ndc_x + 1) * viewport[0] / 2, (1 - ndc_y) * viewport[1] / 2)


def draw_header(draw, title, subtitle, badge):
    draw.rectangle((0, 0, WIDTH, 116), fill=COLORS["dark"])
    draw.text((48, 30), title, font=font(34, True), fill="#ffffff")
    draw.text((49, 77), subtitle, font=font(15), fill="#b9c7cb")
    draw.text((1548, 31), badge, font=font(28, True), fill="#e7ae39", anchor="ra")


def draw_marker(draw, x, y, number, color):
    draw.ellipse((x - 15, y - 15, x + 15, y + 15), fill=color, outline="#ffffff", width=3)
    draw.text((x, y - 1), str(number), font=font(16, True), fill="#ffffff", anchor="mm")


def monitor_color(monitor):
    return COLORS["camera"] if monitor["category"] == "camera" else COLORS["sensor"]


def render_annotated_png(data, source, output_path):
    image = Image.new("RGB", (WIDTH, HEIGHT), COLORS["page"])
    draw = ImageDraw.Draw(image)
    draw_header(draw, "项目实景巷道 · 设备与仪器标注", "PROJECT THREE.JS ROADWAY · REAL-SCENE ANNOTATION", "实景版")

    scene_box = (40, 148, 1096, 808)
    scene = source.resize((scene_box[2] - scene_box[0], scene_box[3] - scene_box[1]), Image.Resampling.LANCZOS)
    image.paste(scene, scene_box[:2])
    draw.rounded_rectangle(scene_box, radius=4, outline="#839399", width=2)
    draw.rectangle((40, 148, 1096, 194), fill="#15242acc")
    draw.text((62, 170), "1206 工作面出口段 / 50 m 运输顺槽", font=font(20, True), fill="#ffffff", anchor="lm")

    projected = [project_monitor(item["position"], data["camera"]) for item in data["monitors"]]
    offsets = [(0, 0), (-18, 18), (0, 0), (0, 0), (30, -16), (0, 0), (18, -4), (0, 0)]
    marker_positions = []
    for index, (monitor, point, offset) in enumerate(zip(data["monitors"], projected, offsets), 1):
        original_x = scene_box[0] + point[0] / 1600 * (scene_box[2] - scene_box[0])
        original_y = scene_box[1] + point[1] / 1000 * (scene_box[3] - scene_box[1])
        marker_x, marker_y = original_x + offset[0], original_y + offset[1]
        if offset != (0, 0):
            draw.line((original_x, original_y, marker_x, marker_y), fill="#ffffff", width=2)
        draw_marker(draw, marker_x, marker_y, index, monitor_color(monitor))
        marker_positions.append((marker_x, marker_y))

    panel = (1124, 148, 1560, 898)
    draw.rounded_rectangle(panel, radius=6, fill=COLORS["paper"], outline=COLORS["line"], width=2)
    draw.text((1150, 180), "8 个真实安装点", font=font(23, True), fill=COLORS["ink"])
    draw.text((1150, 217), "编号与 Three.js 场景一致", font=font(15), fill=COLORS["muted"])
    row_y = 250
    for index, monitor in enumerate(data["monitors"], 1):
        color = monitor_color(monitor)
        draw_marker(draw, 1154, row_y + 15, index, color)
        draw.text((1184, row_y), monitor["name"], font=font(18, True), fill=COLORS["ink"])
        draw.text((1184, row_y + 30), monitor["install"], font=font(13), fill=COLORS["muted"])
        if index < 8:
            draw.line((1150, row_y + 65, 1536, row_y + 65), fill=COLORS["grid"], width=1)
        row_y += 79

    draw.rounded_rectangle((40, 832, 1096, 898), radius=4, fill="#ffffff", outline=COLORS["line"])
    draw.text((62, 853), "画面来自项目当前 Three.js 井下相机，不使用外部矿井图片或生成式替代图。", font=font(17), fill=COLORS["ink"])
    draw.text((48, 951), "依据项目 Three.js 场景生成，非施工图", font=font(16), fill=COLORS["muted"])
    draw.text((1552, 951), "SMART MINE DIGITAL TWIN", font=font(14, True), fill=COLORS["muted"], anchor="ra")
    image.save(output_path, optimize=True)


def render_annotated_svg(data, source, output_path):
    encoded = base64.b64encode(SOURCE_PATH.read_bytes()).decode("ascii")
    scene_box = (40, 148, 1096, 808)
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1600" height="1000" viewBox="0 0 1600 1000">',
        '<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif;letter-spacing:0}</style>',
        f'<rect width="1600" height="1000" fill="{COLORS["page"]}"/>',
        f'<rect width="1600" height="116" fill="{COLORS["dark"]}"/>',
        svg_text(48, 62, "项目实景巷道 · 设备与仪器标注", 34, "#ffffff", 700),
        svg_text(49, 91, "PROJECT THREE.JS ROADWAY · REAL-SCENE ANNOTATION", 15, "#b9c7cb", 400),
        svg_text(1548, 61, "实景版", 28, "#e7ae39", 700, "end"),
        f'<image x="40" y="148" width="1056" height="660" preserveAspectRatio="none" xlink:href="data:image/png;base64,{encoded}"/>',
        '<rect x="40" y="148" width="1056" height="660" fill="none" stroke="#839399" stroke-width="2"/>',
        '<rect x="40" y="148" width="1056" height="46" fill="#15242a" fill-opacity="0.86"/>',
        svg_text(62, 179, "1206 工作面出口段 / 50 m 运输顺槽", 20, "#ffffff", 700),
        f'<rect x="1124" y="148" width="436" height="750" rx="6" fill="{COLORS["paper"]}" stroke="{COLORS["line"]}" stroke-width="2"/>',
        svg_text(1150, 188, "8 个真实安装点", 23, COLORS["ink"], 700),
        svg_text(1150, 219, "编号与 Three.js 场景一致", 15, COLORS["muted"]),
    ]

    projected = [project_monitor(item["position"], data["camera"]) for item in data["monitors"]]
    offsets = [(0, 0), (-18, 18), (0, 0), (0, 0), (30, -16), (0, 0), (18, -4), (0, 0)]
    for index, (monitor, point, offset) in enumerate(zip(data["monitors"], projected, offsets), 1):
        original_x = scene_box[0] + point[0] / 1600 * (scene_box[2] - scene_box[0])
        original_y = scene_box[1] + point[1] / 1000 * (scene_box[3] - scene_box[1])
        marker_x, marker_y = original_x + offset[0], original_y + offset[1]
        color = monitor_color(monitor)
        parts.append(f'<g data-local-monitor="{monitor["id"]}">')
        if offset != (0, 0):
            parts.append(f'<line x1="{original_x:.1f}" y1="{original_y:.1f}" x2="{marker_x:.1f}" y2="{marker_y:.1f}" stroke="#ffffff" stroke-width="2"/>')
        parts.append(f'<circle cx="{marker_x:.1f}" cy="{marker_y:.1f}" r="15" fill="{color}" stroke="#ffffff" stroke-width="3"/>')
        parts.append(svg_text(marker_x, marker_y + 5, index, 16, "#ffffff", 700, "middle"))
        parts.append('</g>')

    row_y = 250
    for index, monitor in enumerate(data["monitors"], 1):
        color = monitor_color(monitor)
        parts.extend([
            f'<circle cx="1154" cy="{row_y + 15}" r="15" fill="{color}" stroke="#ffffff" stroke-width="3"/>',
            svg_text(1154, row_y + 20, index, 16, "#ffffff", 700, "middle"),
            svg_text(1184, row_y + 17, monitor["name"], 18, COLORS["ink"], 700),
            svg_text(1184, row_y + 45, monitor["install"], 13, COLORS["muted"]),
        ])
        if index < 8:
            parts.append(f'<line x1="1150" y1="{row_y + 65}" x2="1536" y2="{row_y + 65}" stroke="{COLORS["grid"]}"/>')
        row_y += 79

    parts.extend([
        f'<rect x="40" y="832" width="1056" height="66" rx="4" fill="#ffffff" stroke="{COLORS["line"]}"/>',
        svg_text(62, 872, "画面来自项目当前 Three.js 井下相机，不使用外部矿井图片或生成式替代图。", 17, COLORS["ink"]),
        svg_text(48, 957, "依据项目 Three.js 场景生成，非施工图", 16, COLORS["muted"]),
        svg_text(1552, 957, "SMART MINE DIGITAL TWIN", 14, COLORS["muted"], 700, "end"),
        '</svg>',
    ])
    output_path.write_text("\n".join(parts), encoding="utf-8")


def edge_points(edge, nodes_by_id):
    if edge.get("points"):
        return edge["points"]
    return [nodes_by_id[edge["from"]]["position"], nodes_by_id[edge["to"]]["position"]]


def topology_transform(data, box):
    nodes_by_id = {node["id"]: node for node in data["nodes"]}
    points = [node["position"] for node in data["nodes"]]
    for edge in data["edges"]:
        points.extend(edge_points(edge, nodes_by_id))
    min_x, max_x = min(p[0] for p in points), max(p[0] for p in points)
    min_z, max_z = min(p[2] for p in points), max(p[2] for p in points)
    left, top, right, bottom = box

    def transform(position):
        x, _, z = position
        return (
            left + 92 + (x - min_x) / (max_x - min_x) * (right - left - 148),
            top + 112 + (z - min_z) / (max_z - min_z) * (bottom - top - 224),
        )

    return transform


def local_monitor_point(monitor, box):
    left, top, right, bottom = box
    x = left + 64 + monitor["meter"] / 50 * (right - left - 104)
    lane_y = {
        "roof-separation": top + 118,
        "anchor-load": top + 155,
        "convergence": top + 312,
        "support-load": top + 350,
        "microseismic": top + 390,
        "camera": top + 210,
    }[monitor["type"]]
    return x, lane_y


def render_topology_png(data, output_path):
    image = Image.new("RGB", (WIDTH, HEIGHT), COLORS["page"])
    draw = ImageDraw.Draw(image)
    draw_header(draw, "项目巷道结构 · 1206 工作面布点", "LIVE TOPOLOGY · FOCUSED ROADWAY MONITORING PLAN", "俯视版")

    global_box = (40, 148, 930, 900)
    local_box = (958, 148, 1560, 900)
    for box in (global_box, local_box):
        draw.rounded_rectangle(box, radius=6, fill=COLORS["paper"], outline=COLORS["line"], width=2)
    draw.text((68, 178), "01  项目实际巷道拓扑", font=font(23, True), fill=COLORS["ink"])
    draw.text((986, 178), "02  实景巷道 0-50 m 展开", font=font(23, True), fill=COLORS["ink"])

    transform = topology_transform(data, global_box)
    nodes_by_id = {node["id"]: node for node in data["nodes"]}
    focus_edges = {"main-level-h3", "intake-gate-road", "return-gate-road", "lower-gate-crosscut", "face-crosscut"}
    for edge in data["edges"]:
        points = [transform(point) for point in edge_points(edge, nodes_by_id)]
        color = COLORS["equipment"] if edge["id"] in focus_edges else COLORS["road"]
        draw.line(points, fill=color, width=18, joint="curve")
        draw.line(points, fill=COLORS["road_core"], width=7, joint="curve")

    label_offsets = {
        "portal": (-10, -42), "h1-junction": (14, 16), "h1-level-end": (12, 10),
        "h2-junction": (14, -50), "h3-junction": (12, -42), "pump-chamber": (10, 8),
        "substation-chamber": (12, 10), "intake-gate-end": (12, 16),
        "return-gate-end": (12, 16), "working-face-1206": (16, -42),
    }
    for node in data["nodes"]:
        x, y = transform(node["position"])
        fill = COLORS["risk"] if node["id"] == "working-face-1206" else COLORS["dark"]
        draw.ellipse((x - 8, y - 8, x + 8, y + 8), fill=fill, outline="#ffffff", width=2)
        ox, oy = label_offsets[node["id"]]
        anchor = "ra" if ox < 0 else "la"
        draw.text((x + ox, y + oy), NODE_NAMES[node["id"]], font=font(16, True), fill=COLORS["ink"], anchor=anchor)
        draw.text((x + ox, y + oy + 23), f'标高 {node["position"][1]:+g} m', font=font(12), fill=COLORS["muted"], anchor=anchor)

    draw.text((68, 852), "绿色线路为通往 1206 工作面的生产区段", font=font(15), fill=COLORS["equipment"])

    tunnel = (988, 250, 1530, 754)
    draw.rounded_rectangle(tunnel, radius=24, fill="#e1e6e7", outline=COLORS["road"], width=8)
    draw.rounded_rectangle((1014, 286, 1510, 724), radius=16, fill="#f8faf9", outline="#aebbc0", width=2)
    draw.rectangle((1014, 286, 1076, 724), fill="#222c30")
    draw.text((1045, 318), "1206", font=font(18, True), fill="#ffffff", anchor="mm")
    draw.text((1045, 346), "工作面", font=font(15), fill="#ffffff", anchor="mm")
    risk_x1 = 1014 + 64 + 14 / 50 * (1530 - 988 - 104)
    risk_x2 = 1014 + 64 + 19 / 50 * (1530 - 988 - 104)
    draw.rectangle((risk_x1, 286, risk_x2, 724), fill="#f3dedd")
    draw.text(((risk_x1 + risk_x2) / 2, 700), "14-19 m 风险关注区", font=font(12, True), fill=COLORS["risk"], anchor="mm")

    equipment_y = [510, 548, 586, 624, 662, 690]
    for item, y in zip(data["equipment"], equipment_y):
        x = 1014 + 64 + min(50, max(0, item["position"][2])) / 50 * (1530 - 988 - 104)
        draw.rounded_rectangle((x - 30, y - 10, x + 30, y + 10), radius=4, fill=COLORS["equipment"])
        draw.text((x, y - 22), item["name"], font=font(11, True), fill=COLORS["equipment"], anchor="mm")

    for index, monitor in enumerate(data["monitors"], 1):
        x, y = local_monitor_point(monitor, tunnel)
        draw_marker(draw, x, y, index, monitor_color(monitor))

    draw.text((1016, 786), "1-8 号点位与实景标注版完全一致", font=font(16, True), fill=COLORS["ink"])
    draw.text((1016, 822), "横向位置按项目 meter 字段；纵向区分顶板、两帮、支架与 CCTV。", font=font(13), fill=COLORS["muted"])
    draw.text((48, 951), "依据项目 Three.js 场景生成，非施工图", font=font(16), fill=COLORS["muted"])
    draw.text((1552, 951), "SMART MINE DIGITAL TWIN", font=font(14, True), fill=COLORS["muted"], anchor="ra")
    image.save(output_path, optimize=True)


def render_topology_svg(data, output_path):
    global_box = (40, 148, 930, 900)
    local_box = (958, 148, 1560, 900)
    transform = topology_transform(data, global_box)
    nodes_by_id = {node["id"]: node for node in data["nodes"]}
    focus_edges = {"main-level-h3", "intake-gate-road", "return-gate-road", "lower-gate-crosscut", "face-crosscut"}
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">',
        '<style>text{font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif;letter-spacing:0}</style>',
        f'<rect width="1600" height="1000" fill="{COLORS["page"]}"/>',
        f'<rect width="1600" height="116" fill="{COLORS["dark"]}"/>',
        svg_text(48, 62, "项目巷道结构 · 1206 工作面布点", 34, "#ffffff", 700),
        svg_text(49, 91, "LIVE TOPOLOGY · FOCUSED ROADWAY MONITORING PLAN", 15, "#b9c7cb"),
        svg_text(1548, 61, "俯视版", 28, "#e7ae39", 700, "end"),
        f'<rect x="40" y="148" width="890" height="752" rx="6" fill="{COLORS["paper"]}" stroke="{COLORS["line"]}" stroke-width="2"/>',
        f'<rect x="958" y="148" width="602" height="752" rx="6" fill="{COLORS["paper"]}" stroke="{COLORS["line"]}" stroke-width="2"/>',
        svg_text(68, 194, "01  项目实际巷道拓扑", 23, COLORS["ink"], 700),
        svg_text(986, 194, "02  实景巷道 0-50 m 展开", 23, COLORS["ink"], 700),
    ]

    for edge in data["edges"]:
        points = [transform(point) for point in edge_points(edge, nodes_by_id)]
        point_string = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
        color = COLORS["equipment"] if edge["id"] in focus_edges else COLORS["road"]
        parts.append(f'<g data-roadway-edge="{edge["id"]}"><polyline points="{point_string}" fill="none" stroke="{color}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><polyline points="{point_string}" fill="none" stroke="{COLORS["road_core"]}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>')

    label_offsets = {
        "portal": (-10, -42), "h1-junction": (14, 16), "h1-level-end": (12, 10),
        "h2-junction": (14, -50), "h3-junction": (12, -42), "pump-chamber": (10, 8),
        "substation-chamber": (12, 10), "intake-gate-end": (12, 16),
        "return-gate-end": (12, 16), "working-face-1206": (16, -42),
    }
    for node in data["nodes"]:
        x, y = transform(node["position"])
        fill = COLORS["risk"] if node["id"] == "working-face-1206" else COLORS["dark"]
        ox, oy = label_offsets[node["id"]]
        anchor = "end" if ox < 0 else "start"
        parts.extend([
            f'<g data-roadway-node="{node["id"]}"><circle cx="{x:.1f}" cy="{y:.1f}" r="8" fill="{fill}" stroke="#ffffff" stroke-width="2"/></g>',
            svg_text(x + ox, y + oy, NODE_NAMES[node["id"]], 16, COLORS["ink"], 700, anchor),
            svg_text(x + ox, y + oy + 21, f'标高 {node["position"][1]:+g} m', 12, COLORS["muted"], 400, anchor),
        ])

    parts.extend([
        svg_text(68, 866, "绿色线路为通往 1206 工作面的生产区段", 15, COLORS["equipment"]),
        f'<rect x="988" y="250" width="542" height="504" rx="24" fill="#e1e6e7" stroke="{COLORS["road"]}" stroke-width="8"/>',
        '<rect x="1014" y="286" width="496" height="438" rx="16" fill="#f8faf9" stroke="#aebbc0" stroke-width="2"/>',
        '<rect x="1014" y="286" width="62" height="438" fill="#222c30"/>',
        svg_text(1045, 318, "1206", 18, "#ffffff", 700, "middle"),
        svg_text(1045, 346, "工作面", 15, "#ffffff", 700, "middle"),
    ])
    risk_x1 = 1014 + 64 + 14 / 50 * (1530 - 988 - 104)
    risk_x2 = 1014 + 64 + 19 / 50 * (1530 - 988 - 104)
    parts.extend([
        f'<rect x="{risk_x1:.1f}" y="286" width="{risk_x2 - risk_x1:.1f}" height="438" fill="#f3dedd"/>',
        svg_text((risk_x1 + risk_x2) / 2, 706, "14-19 m", 12, COLORS["risk"], 700, "middle"),
    ])

    equipment_y = [510, 548, 586, 624, 662, 690]
    for item, y in zip(data["equipment"], equipment_y):
        x = 1014 + 64 + min(50, max(0, item["position"][2])) / 50 * (1530 - 988 - 104)
        parts.extend([
            f'<rect x="{x - 30:.1f}" y="{y - 10}" width="60" height="20" rx="4" fill="{COLORS["equipment"]}"/>',
            svg_text(x, y - 17, item["name"], 11, COLORS["equipment"], 700, "middle"),
        ])

    for index, monitor in enumerate(data["monitors"], 1):
        x, y = local_monitor_point(monitor, (988, 250, 1530, 754))
        color = monitor_color(monitor)
        parts.extend([
            f'<g data-local-monitor="{monitor["id"]}"><circle cx="{x:.1f}" cy="{y:.1f}" r="15" fill="{color}" stroke="#ffffff" stroke-width="3"/>',
            svg_text(x, y + 5, index, 16, "#ffffff", 700, "middle"),
            '</g>',
        ])

    parts.extend([
        svg_text(1016, 804, "1-8 号点位与实景标注版完全一致", 16, COLORS["ink"], 700),
        svg_text(1016, 837, "横向按 meter 字段；纵向区分顶板、两帮、支架与 CCTV。", 13, COLORS["muted"]),
        svg_text(48, 957, "依据项目 Three.js 场景生成，非施工图", 16, COLORS["muted"]),
        svg_text(1552, 957, "SMART MINE DIGITAL TWIN", 14, COLORS["muted"], 700, "end"),
        '</svg>',
    ])
    output_path.write_text("\n".join(parts), encoding="utf-8")


def fit_image(image, size):
    target_w, target_h = size
    source_ratio = image.width / image.height
    target_ratio = target_w / target_h
    if source_ratio > target_ratio:
        crop_w = round(image.height * target_ratio)
        left = (image.width - crop_w) // 2
        image = image.crop((left, 0, left + crop_w, image.height))
    elif source_ratio < target_ratio:
        crop_h = round(image.width / target_ratio)
        top = (image.height - crop_h) // 2
        image = image.crop((0, top, image.width, top + crop_h))
    return image.resize(size, Image.Resampling.LANCZOS)


def render_comparison(annotated_path, topology_path, output_path):
    image = Image.new("RGB", (2000, 700), COLORS["page"])
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 2000, 76), fill=COLORS["dark"])
    draw.text((42, 25), "基于项目实景巷道的两种表达对比", font=font(29, True), fill="#ffffff")
    panels = [(28, 92, 986, 670), (1014, 92, 1972, 670)]
    sources = [Image.open(annotated_path).convert("RGB"), Image.open(topology_path).convert("RGB")]
    labels = [("A  三维实景标注版", "适合答辩：直接证明场景来自本项目"), ("B  真实结构俯视版", "适合报告：清楚解释巷道关系与点位")]
    for box, source, (title, subtitle) in zip(panels, sources, labels):
        draw.rounded_rectangle(box, radius=6, fill="#ffffff", outline=COLORS["line"], width=2)
        thumb = source.resize((800, 500), Image.Resampling.LANCZOS)
        image.paste(thumb, (box[0] + 79, box[1] + 66))
        draw.text((box[0] + 20, box[1] + 18), title, font=font(22, True), fill=COLORS["ink"])
        draw.text((box[2] - 20, box[1] + 23), subtitle, font=font(14), fill=COLORS["muted"], anchor="ra")
    draw.text((40, 690), "两版均使用同一组 8 个项目真实监测点 · 非施工图", font=font(14), fill=COLORS["muted"], anchor="lm")
    image.save(output_path, optimize=True)


def main():
    data, source = load_data()
    FIGURE_DIR.mkdir(parents=True, exist_ok=True)
    annotated_png = FIGURE_DIR / "project-roadway-3d-annotated.png"
    annotated_svg = FIGURE_DIR / "project-roadway-3d-annotated.svg"
    topology_png = FIGURE_DIR / "project-roadway-topology.png"
    topology_svg = FIGURE_DIR / "project-roadway-topology.svg"
    comparison_png = FIGURE_DIR / "project-roadway-comparison.png"

    render_annotated_png(data, source, annotated_png)
    render_annotated_svg(data, source, annotated_svg)
    render_topology_png(data, topology_png)
    render_topology_svg(data, topology_svg)
    render_comparison(annotated_png, topology_png, comparison_png)
    for path in (annotated_png, annotated_svg, topology_png, topology_svg, comparison_png):
        print(path)


if __name__ == "__main__":
    main()
