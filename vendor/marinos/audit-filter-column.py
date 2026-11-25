#!/usr/bin/env python3
"""Check that an app's filter column comes from filters.json and the shell, not from hand-written markup.

    python3 vendor/marinos/audit-filter-column.py .            # report
    python3 vendor/marinos/audit-filter-column.py . --fail     # exit 1 when anything is found

Reads the app's own HTML and JavaScript (not vendored code, tests, docs or data) and finds:
  - a hand-written filter column (`search-sidebar` in a page or in script). The column is drawn from
    `<div class="search-side" data-filter-column="filters.json">`. A panel that is not a filter, such as a list
    of steps, says so with `data-filter-column-exempt="steps"` on its `aside`.
  - a `data-filter-column` file that is missing, is not JSON, or does not follow vendor/marinos/filter-panel.schema.json
    (a placeholder, a search label, a title that starts with "Filter", an "All" text that does not start with
    "All", a group with no visible name, an id or address parameter used twice, an options file that does not exist).
Uses only the Python standard library, so an app's check needs nothing installed.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SKIP = {"vendor", "node_modules", "tests", "archive", "learning", "packages", "docs", ".git", "build", "dist",
        "feeds", "data", "examples"}
HERE = Path(__file__).resolve().parent
# Installed in an app, the schema sits beside this script; in the shell's own checkout it is the pinned Marin UI copy.
SCHEMA_CANDIDATES = [HERE / "filter-panel.schema.json", HERE.parent / "vendor/marin-ui/filter-panel.schema.json"]


def resolve(schema: dict, root: dict) -> dict:
    while "$ref" in schema:
        node = root
        for part in schema["$ref"].lstrip("#/").split("/"):
            node = node[part]
        schema = node
    return schema


def kind_of(value) -> str:
    return {dict: "object", list: "array", str: "string", bool: "boolean", int: "integer", float: "number", type(None): "null"}[type(value)]


def validate(schema: dict, value, root: dict, path: str = "") -> list[str]:
    """The part of JSON Schema that filter-panel.schema.json uses. Returns one message for each problem."""
    schema = resolve(schema, root)
    where = path or "(top)"
    found: list[str] = []
    if "const" in schema and value != schema["const"]:
        return [f"{where}: must be {json.dumps(schema['const'])}"]
    if "enum" in schema and value not in schema["enum"]:
        return [f"{where}: must be one of " + ", ".join(json.dumps(one) for one in schema["enum"])]
    kind = schema.get("type")
    if kind and kind_of(value) != kind and not (kind == "number" and kind_of(value) == "integer"):
        return [f"{where}: must be {kind}"]
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            found.append(f"{where}: must not be empty")
        if "pattern" in schema and not re.search(schema["pattern"], value):
            found.append(f"{where}: \"{value}\" is not allowed here ({schema.get('description', 'wrong format')})")
    if "not" in schema and validate(schema["not"], value, root, path) == []:
        found.append(f"{where}: \"{value}\" is not allowed here ({schema.get('description', 'wrong wording')})")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            found.append(f"{where}: needs at least {schema['minItems']} item(s)")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            found.append(f"{where}: allows at most {schema['maxItems']} item(s)")
        for index, item in enumerate(value):
            if "items" in schema:
                found += validate(schema["items"], item, root, f"{path}[{index}]")
    if isinstance(value, dict):
        for name in schema.get("required", []):
            if name not in value:
                found.append(f"{where}: \"{name}\" is required")
        props = schema.get("properties", {})
        for name, item in value.items():
            if name in props:
                found += validate(props[name], item, root, f"{path}.{name}" if path else name)
            elif schema.get("additionalProperties") is False:
                found.append(f"{where}: \"{name}\" is not allowed here")
        if "if" in schema:
            branch = "then" if not validate(schema["if"], value, root, path) else "else"
            if branch in schema:
                found += validate(schema[branch], value, root, path)
    if "oneOf" in schema:
        branches = [resolve(b, root) for b in schema["oneOf"]]
        # A group names its own shape with "type"; check against that shape so the message is specific.
        named = [b for b in branches if isinstance(value, dict) and "type" in value and b.get("properties", {}).get("type", {}).get("const") == value.get("type")]
        if named:
            found += validate(named[0], value, root, path)
        elif isinstance(value, dict) and "type" in value and any("type" in b.get("properties", {}) for b in branches):
            found.append(f"{where}: type \"{value.get('type')}\" is not one of " + ", ".join(b["properties"]["type"]["const"] for b in branches))
        else:
            passing = [b for b in branches if not validate(b, value, root, path)]
            if len(passing) != 1:
                found.append(f"{where}: does not match exactly one of the allowed shapes")
    return found


def extra_problems(data: dict, base: Path) -> list[str]:
    """What a schema cannot say: ids and address parameters used twice, and options that point at nothing."""
    found = []
    ids = [data.get("search", {}).get("id") if isinstance(data.get("search"), dict) else None]
    params = ["q"]
    for group in data.get("groups", []) if isinstance(data.get("groups"), list) else []:
        if not isinstance(group, dict):
            continue
        ids.append(group.get("id"))
        name = group.get("param") or group.get("id")
        params += [f"{name}-from", f"{name}-to"] if group.get("type") == "date-range" else [name]
    for label, values in (("id", ids), ("address parameter", params)):
        for value in sorted({v for v in values if v and values.count(v) > 1}):
            found.append(f"the {label} \"{value}\" is used more than once")
    for group in data.get("groups", []) if isinstance(data.get("groups"), list) else []:
        spec = group.get("options") if isinstance(group, dict) else None
        if not isinstance(spec, dict) or "from" not in spec:
            continue
        path = base / spec["from"]
        if not path.is_file():
            found.append(f"{group.get('id')}: {spec['from']} does not exist")
            continue
        try:
            records = json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            found.append(f"{group.get('id')}: {spec['from']} is not JSON")
            continue
        for key in filter(None, (spec.get("records") or "").split(".")):
            records = records.get(key) if isinstance(records, dict) else None
        if not isinstance(records, list) or not records:
            found.append(f"{group.get('id')}: {spec['from']} has no list of records at \"{spec.get('records', '')}\"")
            continue
        for field in (spec.get("valueField"), spec.get("labelField"), spec.get("parentField"), *group.get("groupBy", [])):
            if field and not any(isinstance(r, dict) and r.get(field) not in (None, "", []) for r in records):
                found.append(f"{group.get('id')}: no record has a value for \"{field}\"")
    return found


def source_files(app: Path):
    for path in sorted(app.rglob("*")):
        if path.is_file() and path.suffix in {".html", ".js"} and not SKIP & set(path.relative_to(app).parts[:-1]):
            yield path


def audit(app: Path, schema_path: Path | None = None) -> list[str]:
    problems: list[str] = []
    schema_path = schema_path or next((c for c in SCHEMA_CANDIDATES if c.is_file()), None)
    if schema_path is None:
        return ["filter-panel.schema.json was not found beside this script; reinstall the shell"]
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    for path in source_files(app):
        text = path.read_text(encoding="utf-8", errors="replace")
        rel = path.relative_to(app).as_posix()
        for match in re.finditer(r"search-sidebar", text):
            line = text.count("\n", 0, match.start()) + 1
            context = text[max(0, text.rfind("<", 0, match.start())):match.start() + 400]
            if "data-filter-column-exempt" in context.split(">")[0] or "data-filter-column-exempt" in text[match.start():match.start() + 300].split(">")[0]:
                continue
            problems.append(f"{rel}:{line}: hand-written filter column; draw it with data-filter-column and a filters.json")
        for match in re.finditer(r"data-filter-column=[\"']([^\"']+)[\"']", text):
            line = text.count("\n", 0, match.start()) + 1
            target = (path.parent / match.group(1)).resolve()
            if not target.is_file():
                problems.append(f"{rel}:{line}: {match.group(1)} does not exist")
                continue
            try:
                data = json.loads(target.read_text(encoding="utf-8"))
            except ValueError as error:
                problems.append(f"{match.group(1)}: not valid JSON ({error})")
                continue
            for message in validate(schema, data, schema) + (extra_problems(data, target.parent) if isinstance(data, dict) else []):
                problems.append(f"{match.group(1)}: {message}")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("app", type=Path, help="The app's folder")
    parser.add_argument("--schema", type=Path, help="Use this schema file (for testing)")
    parser.add_argument("--fail", action="store_true", help="exit 1 when anything is found")
    args = parser.parse_args()
    problems = audit(args.app.resolve(), args.schema)
    for problem in problems:
        print(problem)
    print(f"Filter column: {len(problems)} problem(s).")
    return 1 if problems and args.fail else 0


if __name__ == "__main__":
    sys.exit(main())
