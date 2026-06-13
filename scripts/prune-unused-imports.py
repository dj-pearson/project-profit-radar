#!/usr/bin/env python3
"""Conservatively remove unused IMPORT bindings flagged by tsc (US-212).

Handles both single-line and multi-line `import ... from '...'` declarations.
For each binding TypeScript reports as unused (TS6133) or whole-import-unused
(TS6192) it removes just that binding (or the whole import when nothing is
left). It deliberately SKIPS:
  - unused *local variables* (TS6133 not inside an import statement) — their RHS
    may have side effects, so they need a human,
  - namespace imports (`import * as x`) and side-effect imports (`import 'x'`),
  - import blocks containing comments (parsing risk).

Removing an unused *named/default binding* cannot change runtime behaviour (a
side-effect import has no binding and is never flagged) nor introduce a type
error (the binding was, by definition, never read).

Usage:
  prune-unused-imports.py <tsc-output.txt> [--apply]
Without --apply it does a dry run and prints what it would change.
"""
import re
import sys
from collections import defaultdict

ERR_RE = re.compile(r"^(.+?)\((\d+),(\d+)\): error (TS6133|TS6192): (.*)$")
NAME_RE = re.compile(r"'([^']+)' is declared but its value is never read")
# import <clause> from '<src>'; — clause may span multiple lines.
IMPORT_RE = re.compile(
    r"^[ \t]*import\b[\s\S]*?from\s*['\"][^'\"]+['\"];?[ \t]*$",
    re.MULTILINE,
)


def binding_id(entry: str) -> str:
    e = entry.strip()
    if e.startswith("type "):
        e = e[5:].strip()
    if " as " in e:
        e = e.split(" as ", 1)[1].strip()
    return e.strip()


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def rebuild_import(stmt: str, unused: set, whole: bool):
    """Given a full import statement and the set of unused local binding names,
    return the replacement string (possibly '' to delete) or None to leave it
    untouched (unparseable / nothing to do)."""
    if "* as " in stmt or "*as " in stmt:
        return None  # namespace import — don't touch
    if "//" in stmt or "/*" in stmt:
        return None  # comments inside — too risky to rewrite
    m = re.match(
        r"^([ \t]*import\s+(?:type\s+)?)([\s\S]*?)(\s+from\s*['\"][^'\"]+['\"];?[ \t]*)$",
        stmt,
    )
    if not m:
        return None
    prefix, clause, tail = m.group(1), m.group(2).strip(), m.group(3)

    default_part = None
    named_inner = None
    if clause.startswith("{"):
        named_inner = clause
    elif "{" in clause:
        d, rest = clause.split(",", 1)
        default_part = d.strip()
        named_inner = rest.strip()
    else:
        default_part = clause.strip()

    removed = set()
    if whole:
        # every binding unused
        return ""  # caller strips trailing newline

    if default_part and default_part in unused:
        removed.add(default_part)
        default_part = None

    kept = []
    if named_inner is not None:
        inner = named_inner.strip()
        if inner.startswith("{"):
            inner = inner[1:]
        if inner.endswith("}"):
            inner = inner[:-1]
        for entry in inner.split(","):
            if not entry.strip():
                continue
            if binding_id(entry) in unused:
                removed.add(binding_id(entry))
            else:
                kept.append(entry.strip())

    if not removed:
        return None  # nothing matched — leave as-is

    pieces = []
    if default_part:
        pieces.append(default_part)
    if named_inner is not None and kept:
        pieces.append("{ " + ", ".join(kept) + " }")
    if not pieces:
        return ""  # whole import now empty -> delete
    # Collapse a multi-line import down to one tidy line.
    new_prefix = prefix.rstrip("\n")
    new_tail = " " + tail.strip()
    return f"{new_prefix}{', '.join(pieces)}{new_tail}"


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    tsc_out = sys.argv[1]
    apply = "--apply" in sys.argv

    per_file_line_names = defaultdict(lambda: defaultdict(set))  # file->line->names
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
                    per_file_line_names[path][ln].add(nm.group(1))

    files = set(per_file_line_names) | set(per_file_whole)
    bindings_removed = 0
    imports_deleted = 0
    skipped_locals = 0
    changed_files = 0

    for path in sorted(files):
        try:
            with open(path, encoding="utf-8") as fh:
                text = fh.read()
        except FileNotFoundError:
            continue

        line_names = per_file_line_names.get(path, {})
        whole_lines = per_file_whole.get(path, set())

        # Map every import statement to its line span.
        imports = []  # (start_off, end_off, start_line, end_line, stmt)
        for mt in IMPORT_RE.finditer(text):
            s, e = mt.start(), mt.end()
            imports.append((s, e, line_of(text, s), line_of(text, e), mt.group(0)))

        # Which flagged lines belong to an import (to count true skipped locals).
        flagged_lines = set(line_names) | whole_lines
        import_line_set = set()
        for _s, _e, sl, el, _stmt in imports:
            import_line_set.update(range(sl, el + 1))

        edits = []  # (start_off, end_off, replacement)
        for s, e, sl, el, stmt in imports:
            unused = set()
            for ln, names in line_names.items():
                if sl <= ln <= el:
                    unused |= names
            whole = any(sl <= ln <= el for ln in whole_lines)
            if not unused and not whole:
                continue
            repl = rebuild_import(stmt, unused, whole)
            if repl is None:
                continue
            if repl == "":
                # delete the statement plus its trailing newline
                end = e
                if end < len(text) and text[end] == "\n":
                    end += 1
                edits.append((s, end, ""))
                imports_deleted += 1
            else:
                edits.append((s, e, repl))
                bindings_removed += len(unused)

        # count genuine non-import unused (locals) for reporting
        for ln in flagged_lines:
            if ln not in import_line_set:
                skipped_locals += len(line_names.get(ln, {1})) if ln in line_names else 1

        if not edits:
            continue
        changed_files += 1
        if apply:
            for s, e, repl in sorted(edits, key=lambda x: x[0], reverse=True):
                text = text[:s] + repl + text[e:]
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(text)

    mode = "APPLIED" if apply else "DRY-RUN"
    print(f"[{mode}] files changed: {changed_files}")
    print(f"  imports rewritten (bindings removed ~{bindings_removed})")
    print(f"  whole imports deleted: {imports_deleted}")
    print(f"  skipped (unused locals / non-import, left for manual): {skipped_locals}")


if __name__ == "__main__":
    main()
