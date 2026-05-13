#!/usr/bin/env python3
"""第 1 行丢弃，第 2 行表头（tab），第 3 行起为数据。
用法：python3 <本脚本> <游戏id> <表名>
例：python3 <脚本名> ttbd94cb29229c7fea02 announcements
读：conf1/<表名>.xlsx  写：conf/<游戏id>/<表名>.json（可写 announcements.xlsx，会自动识别）
"""
import csv
import io
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONF1 = ROOT / "conf1"


def main() -> None:
    if len(sys.argv) < 3 or not sys.argv[1].strip() or not sys.argv[2].strip():
        me = Path(sys.argv[0]).name
        sys.exit(
            f"用法: python3 {me} <游戏id> <表名>\n"
            f"示例: python3 {me} ttbd94cb29229c7fea02 announcements\n"
            "从 conf1/<表名>.xlsx 读取，写入 conf/<游戏id>/<表名>.json"
        )
    game_id = sys.argv[1].strip()
    base = Path(sys.argv[2].strip()).name
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
