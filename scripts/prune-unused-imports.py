#!/usr/bin/env python3
"""Conservatively remove unused IMPORT bindings flagged by tsc (US-212).

Only touches single-line `import ... from '...'` declarations. For each binding
TypeScript reports as unused (TS6133) or whole-import-unused (TS6192) it removes
just that binding (or the whole import when nothing is left). It deliberately
SKIPS:
  - unused *local variables* (TS6133 that isn't on an import line) — their RHS
    may have side effects, so they need a human,
  - multi-line imports / namespace (`import * as x`) / side-effect imports,
  - anything it can't parse with certainty.

This can only ever remove unused *named/default bindings*, which cannot change
runtime behaviour (a side-effect import has no binding and is never flagged).

Usage:
  prune-unused-imports.py <tsc-output.txt> [--apply]
Without --apply it does a dry run and prints what it would change.
"""
import re
import sys
from collections import defaultdict

ERR_RE = re.compile(r"^(.+?)\((\d+),(\d+)\): error (TS6133|TS6192): (.*)$")
NAME_RE = re.compile(r"'([^']+)' is declared but its value is never read")


def binding_id(entry: str) -> str:
    """Identifier a named-import entry binds locally. Handles `X as Y` and
    `type X` / `type X as Y`."""
    e = entry.strip()
    if e.startswith("type "):
        e = e[5:].strip()
    if " as " in e:
        e = e.split(" as ", 1)[1].strip()
    return e.strip()


def is_single_line_import(line: str) -> bool:
    s = line.strip()
    if not (s.startswith("import ") or s.startswith("import type ")):
        return False
    # must be a from-import that opens and closes on this line
    if " from " not in s:
        return False
    if "{" in s and "}" not in s:
        return False  # multi-line named block
    return s.rstrip().endswith(";") or s.rstrip().endswith('"') or s.rstrip().endswith("'")


def prune_line(line: str, unused: set, whole: bool):
    """Return (new_line_or_None, removed_names). None => delete the line.
    Returns (line, set()) unchanged when nothing safe to do."""
    if whole:
        return None, {"<all>"}
    # Split into the import-clause and the `from '...'` tail.
    m = re.match(r"^(\s*import\s+(?:type\s+)?)(.*?)(\s+from\s+.*)$", line.rstrip("\n"))
    if not m:
        return line, set()
    prefix, clause, tail = m.group(1), m.group(2).strip(), m.group(3)
    removed = set()

    default_part = None
    named_part = None
    # clause forms: `Foo`, `{ a, b }`, `Foo, { a, b }`
    if clause.startswith("{"):
        named_part = clause
    elif "{" in clause:
        d, rest = clause.split(",", 1)
        default_part = d.strip()
        named_part = rest.strip()
    else:
        default_part = clause.strip()

    # Default binding unused?
    if default_part and default_part in unused:
        removed.add(default_part)
        default_part = None

    kept_named = []
    if named_part:
        inner = named_part.strip()[1:-1]  # strip { }
        for entry in inner.split(","):
            if not entry.strip():
                continue
            bid = binding_id(entry)
            if bid in unused:
                removed.add(bid)
            else:
                kept_named.append(entry.strip())

    if not removed:
        return line, set()

    pieces = []
    if default_part:
        pieces.append(default_part)
    if named_part is not None and kept_named:
        pieces.append("{ " + ", ".join(kept_named) + " }")

    if not pieces:
        return None, removed  # whole import now empty -> delete
    return f"{prefix}{', '.join(pieces)}{tail}\n", removed


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    tsc_out = sys.argv[1]
    apply = "--apply" in sys.argv

    per_file_unused = defaultdict(lambda: defaultdict(set))  # file -> line -> names
    per_file_whole = defaultdict(set)  # file -> {line}
    with open(tsc_out, encoding="utf-8", errors="replace") as f:
        for raw in f:
            m = ERR_RE.match(raw.rstrip("\n"))
            if not m:
                continue
            path, ln, _col, code, msg = m.groups()
            ln = int(ln)
            if code == "TS6192":
                per_file_whole[path].add(ln)
            else:
                nm = NAME_RE.search(msg)
                if nm:
                    per_file_unused[path][ln].add(nm.group(1))

    files = set(per_file_unused) | set(per_file_whole)
    total_removed = 0
    total_lines_deleted = 0
    skipped_locals = 0
    changed_files = 0

    for path in sorted(files):
        try:
            with open(path, encoding="utf-8") as fh:
                lines = fh.readlines()
        except FileNotFoundError:
            continue
        flagged = set(per_file_unused.get(path, {})) | per_file_whole.get(path, set())
        new_lines = list(lines)
        file_changed = False
        for ln in sorted(flagged, reverse=True):
            idx = ln - 1
            if idx < 0 or idx >= len(new_lines):
                continue
            line = new_lines[idx]
            whole = ln in per_file_whole.get(path, set())
            if not is_single_line_import(line):
                if not whole:
                    skipped_locals += 1
                continue
            unused = per_file_unused.get(path, {}).get(ln, set())
            result, removed = prune_line(line, unused, whole)
            if not removed:
                continue
            if result is None:
                del new_lines[idx]
                total_lines_deleted += 1
            else:
                new_lines[idx] = result
            total_removed += len(removed)
            file_changed = True
        if file_changed:
            changed_files += 1
            if apply:
                with open(path, "w", encoding="utf-8") as fh:
                    fh.writelines(new_lines)

    mode = "APPLIED" if apply else "DRY-RUN"
    print(f"[{mode}] files changed: {changed_files}")
    print(f"  import bindings removed: {total_removed}")
    print(f"  whole import lines deleted: {total_lines_deleted}")
    print(f"  skipped (unused locals / non-import, left for manual): {skipped_locals}")


if __name__ == "__main__":
    main()
