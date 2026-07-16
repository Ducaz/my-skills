#!/usr/bin/env python3
"""Validate candidate tags against Danbooru and classify Exact/Common sets."""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


CATEGORY_NAMES = {0: "general", 1: "artist", 3: "copyright", 4: "character", 5: "meta"}


def normalize_tag(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


def chunks(values: list[str], size: int):
    for index in range(0, len(values), size):
        yield values[index : index + size]


def fetch_json(url: str, retries: int, timeout: float) -> Any:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "Codex-Danbooru-Image-Tags/1.1"})
    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=timeout) as response:
                content_type = response.headers.get_content_type()
                if content_type != "application/json":
                    raise RuntimeError(f"expected application/json, got {content_type}")
                return json.load(response)
        except HTTPError as exc:
            if exc.code != 429 and not 500 <= exc.code < 600:
                raise RuntimeError(f"HTTP {exc.code} from Danbooru") from exc
            error: Exception = exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            error = exc
        if attempt < retries:
            time.sleep(min(2**attempt, 8))
    raise RuntimeError(f"Danbooru request failed after {retries + 1} attempts: {error}")


def validate(args: argparse.Namespace) -> dict[str, Any]:
    raw_lines = Path(args.input).read_text(encoding="utf-8-sig").splitlines()
    candidates = list(dict.fromkeys(normalize_tag(line) for line in raw_lines if line.strip()))
    if not candidates:
        raise ValueError("input contains no tags")

    found: dict[str, dict[str, Any]] = {}
    endpoint = args.endpoint.rstrip("/") + "/tags.json"
    for batch in chunks(candidates, args.batch_size):
        query: dict[str, str | int] = {
            "search[name_normalize]": ",".join(batch),
            "limit": len(batch),
        }
        if args.login:
            query["login"] = args.login
        if args.api_key:
            query["api_key"] = args.api_key
        payload = fetch_json(f"{endpoint}?{urlencode(query)}", args.retries, args.timeout)
        if not isinstance(payload, list):
            raise RuntimeError("Danbooru returned an unexpected JSON shape")
        for item in payload:
            if not isinstance(item, dict) or "name" not in item:
                raise RuntimeError("Danbooru returned a malformed tag record")
            name = normalize_tag(str(item["name"]))
            if name in batch:
                found[name] = item

    valid = []
    rejected = []
    for name in candidates:
        item = found.get(name)
        if item is None:
            rejected.append({"name": name, "reason": "not_found"})
            continue
        count = int(item.get("post_count", 0))
        deprecated = bool(item.get("is_deprecated", False))
        if deprecated:
            rejected.append({"name": name, "reason": "deprecated", "post_count": count})
            continue
        if count <= 0:
            rejected.append({"name": name, "reason": "empty", "post_count": count})
            continue
        category = int(item.get("category", 0))
        valid.append(
            {
                "name": name,
                "category": category,
                "category_name": CATEGORY_NAMES.get(category, "unknown"),
                "post_count": count,
            }
        )

    return {
        "endpoint": endpoint,
        "validated_at": datetime.now(timezone.utc).isoformat(),
        "min_post_count": args.min_post_count,
        "input_count": len(candidates),
        "valid_count": len(valid),
        "rejected_count": len(rejected),
        "exact": valid,
        "common": [item for item in valid if item["post_count"] >= args.min_post_count],
        "rejected": rejected,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="UTF-8 text file with one candidate tag per line")
    parser.add_argument("--output", help="write the JSON report to this path; stdout if omitted")
    parser.add_argument("--endpoint", default="https://danbooru.donmai.us", help="Danbooru base URL")
    parser.add_argument(
        "--min-post-count",
        "--common-min-count",
        dest="min_post_count",
        type=int,
        default=1000,
        help="minimum post_count for Common tags (default: 1000)",
    )
    parser.add_argument("--batch-size", type=int, default=50)
    parser.add_argument("--login")
    parser.add_argument("--api-key")
    parser.add_argument("--timeout", type=float, default=20.0)
    parser.add_argument("--retries", type=int, default=3)
    args = parser.parse_args()
    if args.min_post_count < 1:
        parser.error("--min-post-count must be at least 1")
    if not 1 <= args.batch_size <= 100:
        parser.error("--batch-size must be between 1 and 100")
    if bool(args.login) != bool(args.api_key):
        parser.error("--login and --api-key must be provided together")
    return args


def main() -> int:
    args = parse_args()
    try:
        report = validate(args)
        rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
        if args.output:
            Path(args.output).write_text(rendered, encoding="utf-8")
        else:
            sys.stdout.write(rendered)
        return 0
    except (OSError, ValueError, RuntimeError) as exc:
        print(f"validation failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
