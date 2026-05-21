#!/usr/bin/env python3
"""第 1 行丢弃，第 2 行表头（tab），第 3 行起为数据。
用法：python3 <本脚本> <游戏id> <表名>
例：python3 <脚本名> ttbd94cb29229c7fea02 announcements
读：conf1/<表名>.xlsx  写：conf/<游戏id>/<表名>.json（可写 announcements.xlsx，会自动识别）
"""
import csv
import io
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONF1 = ROOT / "conf1"
CHART_CONVERTER = ROOT / "excel_to_chart_data.py"
VERSION_CONVERTER = ROOT / "excel_to_version_json.py"
RETENTION_CONVERTER = ROOT / "excel_to_retention_json.py"


def main() -> None:
    if len(sys.argv) < 3 or not sys.argv[1].strip() or not sys.argv[2].strip():
        me = Path(sys.argv[0]).name
        sys.exit(
            f"用法: python3 {me} <游戏id> <表名>\n"
            f"示例: python3 {me} ttbd94cb29229c7fea02 announcements\n"
            "从 conf1/<表名>.xlsx 读取，写入 conf/<游戏id>/<表名>.json"
        )
    game_id = sys.argv[1].strip()
    table_name = sys.argv[2].strip()
    base = Path(table_name).name

    # retention-data 走专用转换器：Excel(retention-data.xlsx) -> retention-data.json
    if base.lower() in ("retention", "retention-data", "retention_data", "retention-data.xlsx"):
        src = CONF1 / "retention-data.xlsx"
        if not src.is_file():
            sys.exit(f"找不到 {src}")
        if not RETENTION_CONVERTER.is_file():
            sys.exit(f"找不到转换脚本 {RETENTION_CONVERTER}")

        out = ROOT / "conf" / game_id / "retention-data.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            sys.executable,
            str(RETENTION_CONVERTER),
            "--input",
            str(src),
            "--output",
            str(out),
            "--source-json",
            str(out),
        ]
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            sys.exit(f"retention-data 转换失败，退出码: {e.returncode}")
        print(out)
        return

    # version 走专用转换器：Excel(version.xlsx) -> version.json
    if base.lower() in ("version_excel", "version-xlsx", "version.xlsx", "version"):
        src = CONF1 / "version.xlsx"
        if not src.is_file():
            sys.exit(f"找不到 {src}")
        if not VERSION_CONVERTER.is_file():
            sys.exit(f"找不到转换脚本 {VERSION_CONVERTER}")

        out = ROOT / "conf" / game_id / "version.json"
        out.parent.mkdir(parents=True, exist_ok=True)
        cmd = [
            sys.executable,
            str(VERSION_CONVERTER),
            "--input",
            str(src),
            "--output",
            str(out),
        ]
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            sys.exit(f"version 转换失败，退出码: {e.returncode}")
        print(out)
        return

    # chart_data 走专用转换器：Excel(行为分析/实时分析) -> chart-data.json
    if base.lower() in ("chart_data", "chart-data", "chart_data.xlsx", "chart-data.xlsx"):
        src = CONF1 / "chart-data.xlsx"
        if not src.is_file():
            sys.exit(f"找不到 {src}")
        if not CHART_CONVERTER.is_file():
            sys.exit(f"找不到转换脚本 {CHART_CONVERTER}")

        out = ROOT / "conf" / game_id / "chart-data.json"
        out.parent.mkdir(parents=True, exist_ok=True)

        cmd = [
            sys.executable,
            str(CHART_CONVERTER),
            "--input",
            str(src),
            "--output",
            str(out),
        ]
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            sys.exit(f"chart_data 转换失败，退出码: {e.returncode}")
        print(out)
        return

    if not base.lower().endswith(".xlsx"):
        base = f"{base}.xlsx"
    src = CONF1 / base
    if not src.is_file():
        sys.exit(f"找不到 {src}")

    lines = src.read_text(encoding="utf-8-sig").splitlines()
    if len(lines) < 2:
        sys.exit("至少需要 2 行（第 2 行为表头）")

    body = io.StringIO("\n".join(lines[1:]))
    rows = []
    for row in csv.DictReader(body, delimiter="\t"):
        if not row or not any((v or "").strip() for v in row.values()):
            continue
        item = {k: (v or "").strip() for k, v in row.items() if k}
        if "hasBadge" in item:
            item["hasBadge"] = item["hasBadge"].lower() in ("true", "1", "yes", "是")
        if "id" in item:
            item["id"] = str(item["id"])
        rows.append(item)

    out = ROOT / "conf" / game_id / (src.stem + ".json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps({"announcements": rows}, ensure_ascii=False, indent=4) + "\n",
        encoding="utf-8",
    )
    print(out)


if __name__ == "__main__":
    main()
