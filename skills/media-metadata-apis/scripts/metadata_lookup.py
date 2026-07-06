#!/usr/bin/env python3
"""
Reusable metadata lookup helper for Jellyfin media organization.

Reads credentials from a local .env file and queries TMDb, TVDB v4, and AniDB.
Outputs JSON by default so the result can be piped into other organizer scripts.
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


DEFAULT_ENV = Path.cwd() / ".env" if (Path.cwd() / ".env").exists() else Path(__file__).resolve().parents[1] / ".env"
TVDB_BASE = "https://api4.thetvdb.com/v4"
TMDB_BASE = "https://api.themoviedb.org/3"
ANIDB_BASE = "http://api.anidb.net:9001/httpapi"


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8-sig", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def save_env(path: Path, updates: dict[str, str]) -> None:
    existing = path.read_text(encoding="utf-8-sig", errors="ignore").splitlines() if path.exists() else []
    seen: set[str] = set()
    next_lines: list[str] = []
    for line in existing:
        if "=" not in line or line.strip().startswith("#"):
            next_lines.append(line)
            continue
        key, _ = line.split("=", 1)
        clean_key = key.strip().lstrip("\ufeff")
        if clean_key in updates:
            next_lines.append(f"{clean_key}={updates[clean_key]}")
            seen.add(clean_key)
        else:
            next_lines.append(line)
    for key, value in updates.items():
        if key not in seen:
            next_lines.append(f"{key}={value}")
    path.write_text("\n".join(next_lines) + "\n", encoding="utf-8")


def request_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, body: Any = None) -> Any:
    data = None
    request_headers = {"Accept": "application/json", "User-Agent": "codex-metadata-lookup"}
    if headers:
        request_headers.update(headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=request_headers, method=method)
    last_error: Exception | None = None
    for _ in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError:
            raise
        except Exception as exc:  # Network hiccups are common enough to retry.
            last_error = exc
            time.sleep(1)
    raise RuntimeError(f"request failed after retries: {last_error}")


def request_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "codex-metadata-lookup"})
    last_error: Exception | None = None
    for _ in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                if resp.headers.get("Content-Encoding", "").lower() == "gzip" or data.startswith(b"\x1f\x8b"):
                    data = gzip.decompress(data)
                return data.decode("utf-8", errors="replace")
        except Exception as exc:
            last_error = exc
            time.sleep(1)
    raise RuntimeError(f"request failed after retries: {last_error}")


def tmdb_headers(env: dict[str, str]) -> dict[str, str]:
    token = env.get("TMDB_READ_ACCESS_TOKEN")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


def tmdb_params(env: dict[str, str], params: dict[str, Any]) -> str:
    next_params = {k: v for k, v in params.items() if v is not None and v != ""}
    if not env.get("TMDB_READ_ACCESS_TOKEN") and env.get("TMDB_API_KEY"):
        next_params["api_key"] = env["TMDB_API_KEY"]
    return urllib.parse.urlencode(next_params)


def tmdb_get(env: dict[str, str], path: str, params: dict[str, Any] | None = None) -> Any:
    query = tmdb_params(env, params or {})
    url = f"{TMDB_BASE}{path}" + (f"?{query}" if query else "")
    return request_json(url, headers=tmdb_headers(env))


def clean_year(date_value: str | None) -> str | None:
    if date_value and len(date_value) >= 4 and date_value[:4].isdigit():
        return date_value[:4]
    return None


def tmdb_movie_summary(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider": "tmdb",
        "type": "movie",
        "id": item.get("id"),
        "title": item.get("title"),
        "original_title": item.get("original_title"),
        "original_language": item.get("original_language"),
        "date": item.get("release_date"),
        "year": clean_year(item.get("release_date")),
        "overview": item.get("overview"),
        "external_ids": item.get("external_ids"),
        "aliases": [x.get("title") for x in item.get("alternative_titles", {}).get("titles", []) if x.get("title")],
    }


def tmdb_tv_summary(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider": "tmdb",
        "type": "tv",
        "id": item.get("id"),
        "title": item.get("name"),
        "original_title": item.get("original_name"),
        "original_language": item.get("original_language"),
        "date": item.get("first_air_date"),
        "year": clean_year(item.get("first_air_date")),
        "number_of_seasons": item.get("number_of_seasons"),
        "number_of_episodes": item.get("number_of_episodes"),
        "overview": item.get("overview"),
        "external_ids": item.get("external_ids"),
        "aliases": [x.get("title") for x in item.get("alternative_titles", {}).get("results", []) if x.get("title")],
    }


def handle_tmdb(args: argparse.Namespace, env: dict[str, str]) -> Any:
    if args.kind == "movie":
        if args.id:
            item = tmdb_get(env, f"/movie/{args.id}", {"language": args.language, "append_to_response": "external_ids,alternative_titles"})
            return tmdb_movie_summary(item)
        data = tmdb_get(env, "/search/movie", {"query": args.query, "year": args.year, "language": args.language})
        return {"provider": "tmdb", "type": "movie_search", "results": [tmdb_movie_summary(x) for x in data.get("results", [])[: args.limit]]}
    if args.id:
        item = tmdb_get(env, f"/tv/{args.id}", {"language": args.language, "append_to_response": "external_ids,alternative_titles"})
        return tmdb_tv_summary(item)
    data = tmdb_get(env, "/search/tv", {"query": args.query, "first_air_date_year": args.year, "language": args.language})
    return {"provider": "tmdb", "type": "tv_search", "results": [tmdb_tv_summary(x) for x in data.get("results", [])[: args.limit]]}


def tvdb_token_expired(env: dict[str, str]) -> bool:
    token = env.get("TVDB_TOKEN")
    expiry = env.get("TVDB_TOKEN_EXPIRES_AT")
    if not token or not expiry:
        return True
    try:
        expires_at = datetime.fromisoformat(expiry.replace("Z", "+00:00"))
    except ValueError:
        return True
    return datetime.now(timezone.utc) >= expires_at - timedelta(minutes=10)


def tvdb_login(env: dict[str, str], env_path: Path) -> str:
    if not env.get("TVDB_API_KEY"):
        raise SystemExit("TVDB_API_KEY is missing in .env")
    body = {"apikey": env["TVDB_API_KEY"]}
    if env.get("TVDB_PIN"):
        body["pin"] = env["TVDB_PIN"]
    data = request_json(f"{TVDB_BASE}/login", method="POST", body=body)
    token = data.get("data", {}).get("token")
    if not token:
        raise RuntimeError("TVDB login did not return a token")
    expires_at = (datetime.now(timezone.utc) + timedelta(days=29)).isoformat()
    save_env(env_path, {"TVDB_TOKEN": token, "TVDB_TOKEN_EXPIRES_AT": expires_at})
    env["TVDB_TOKEN"] = token
    env["TVDB_TOKEN_EXPIRES_AT"] = expires_at
    return token


def tvdb_get(env: dict[str, str], env_path: Path, path: str, params: dict[str, Any] | None = None) -> Any:
    token = tvdb_login(env, env_path) if tvdb_token_expired(env) else env["TVDB_TOKEN"]
    query = urllib.parse.urlencode({k: v for k, v in (params or {}).items() if v is not None and v != ""})
    url = f"{TVDB_BASE}{path}" + (f"?{query}" if query else "")
    try:
        return request_json(url, headers={"Authorization": f"Bearer {token}"})
    except urllib.error.HTTPError as exc:
        if exc.code != 401:
            raise
        token = tvdb_login(env, env_path)
        return request_json(url, headers={"Authorization": f"Bearer {token}"})


def tvdb_summary(item: dict[str, Any], item_type: str) -> dict[str, Any]:
    return {
        "provider": "tvdb",
        "type": item_type,
        "id": item.get("id") or item.get("tvdb_id"),
        "title": item.get("name") or item.get("nameTranslations", [None])[0],
        "year": item.get("year"),
        "date": item.get("firstAired") or item.get("released"),
        "status": item.get("status"),
        "overview": item.get("overview"),
        "remote_ids": item.get("remoteIds"),
        "aliases": item.get("aliases"),
    }


def handle_tvdb(args: argparse.Namespace, env: dict[str, str], env_path: Path) -> Any:
    if args.id:
        if args.kind == "movie":
            data = tvdb_get(env, env_path, f"/movies/{args.id}/extended")
            return tvdb_summary(data.get("data", {}), "movie")
        data = tvdb_get(env, env_path, f"/series/{args.id}/extended")
        item = data.get("data", {})
        summary = tvdb_summary(item, "series")
        summary["seasons"] = item.get("seasons")
        return summary
    data = tvdb_get(env, env_path, "/search", {"query": args.query, "type": args.kind})
    return {"provider": "tvdb", "type": f"{args.kind}_search", "results": [tvdb_summary(x, args.kind) for x in data.get("data", [])[: args.limit]]}


def anidb_text(node: ET.Element | None) -> str | None:
    if node is None or node.text is None:
        return None
    return re.sub(r"\s+", " ", node.text).strip()


def handle_anidb(args: argparse.Namespace, env: dict[str, str]) -> Any:
    for key in ["ANIDB_CLIENT", "ANIDB_CLIENT_VERSION", "ANIDB_PROTO_VERSION"]:
        if not env.get(key):
            raise SystemExit(f"{key} is missing in .env")
    if not args.aid:
        raise SystemExit("AniDB lookup requires --aid")
    params = {
        "client": env["ANIDB_CLIENT"],
        "clientver": env["ANIDB_CLIENT_VERSION"],
        "protover": env["ANIDB_PROTO_VERSION"],
        "request": "anime",
        "aid": args.aid,
    }
    url = f"{ANIDB_BASE}?{urllib.parse.urlencode(params)}"
    root = ET.fromstring(request_text(url))
    titles = []
    for title in root.findall("./titles/title"):
        titles.append({"type": title.attrib.get("type"), "language": title.attrib.get("{http://www.w3.org/XML/1998/namespace}lang"), "title": anidb_text(title)})
    episodes = []
    for ep in root.findall("./episodes/episode"):
        epno = ep.find("epno")
        titles_for_ep = []
        for title in ep.findall("./title"):
            titles_for_ep.append({"language": title.attrib.get("{http://www.w3.org/XML/1998/namespace}lang"), "title": anidb_text(title)})
        episodes.append({"episode": anidb_text(epno), "type": epno.attrib.get("type") if epno is not None else None, "titles": titles_for_ep})
    return {
        "provider": "anidb",
        "type": "anime",
        "id": args.aid,
        "title": anidb_text(root.find("./titles/title[@type='main']")) or (titles[0]["title"] if titles else None),
        "start_date": anidb_text(root.find("./startdate")),
        "end_date": anidb_text(root.find("./enddate")),
        "episode_count": len(episodes),
        "titles": titles,
        "episodes": episodes,
    }


def add_common(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--env", default=str(DEFAULT_ENV), help="Path to .env credentials file")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description="Query TMDb, TVDB, and AniDB metadata for Jellyfin organization")
    add_common(parser)
    sub = parser.add_subparsers(dest="provider", required=True)

    tmdb = sub.add_parser("tmdb", help="Query TMDb movie or TV metadata")
    add_common(tmdb)
    tmdb.add_argument("kind", choices=["movie", "tv"])
    tmdb.add_argument("--id", help="TMDb ID")
    tmdb.add_argument("--query", help="Title search query")
    tmdb.add_argument("--year", help="Movie year or TV first-air year")
    tmdb.add_argument("--language", default="en-US")
    tmdb.add_argument("--limit", type=int, default=10)

    tvdb = sub.add_parser("tvdb", help="Query TVDB series or movie metadata")
    add_common(tvdb)
    tvdb.add_argument("kind", choices=["series", "movie"])
    tvdb.add_argument("--id", help="TVDB ID")
    tvdb.add_argument("--query", help="Title search query")
    tvdb.add_argument("--limit", type=int, default=10)

    anidb = sub.add_parser("anidb", help="Query AniDB anime metadata")
    add_common(anidb)
    anidb.add_argument("--aid", required=True, help="AniDB anime aid")

    args = parser.parse_args()
    if getattr(args, "provider", None) in {"tmdb", "tvdb"} and not args.id and not getattr(args, "query", None):
        parser.error("provide --id or --query")
    env_path = Path(args.env).resolve()
    env = load_env(env_path)
    if args.provider == "tmdb":
        result = handle_tmdb(args, env)
    elif args.provider == "tvdb":
        result = handle_tvdb(args, env, env_path)
    else:
        result = handle_anidb(args, env)
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
