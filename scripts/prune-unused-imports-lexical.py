#!/usr/bin/env python3
"""Remove unused IMPORT bindings by lexical analysis (US-212), no tsc needed.

For every `import ... from '...'` statement (single- or multi-line) this checks
whether each imported binding's identifier appears ANYWHERE else in the file
(outside the import statements). If it appears nowhere, the binding is unused
and is removed. This is the same determination `noUnusedLocals` makes, but done
lexically so it needs no (slow) tsc run and never goes stale after edits.

Conservatism / safety:
  - It only ever removes a binding whose identifier occurs ZERO times in the
    rest of the file, so it cannot remove something that is used.
  - If an identifier appears in a comment or string it is conservatively treated
    as "used" (kept) — we under-remove rather than risk breakage.
  - SKIPS namespace imports (`import * as x`), side-effect imports (`import 'x'`)
    and any import block containing a comment.

Usage: prune-unused-imports-lexical.py <dir> [--apply]
Dry run by default.
"""
import os
import re
import sys

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


def parse_clause(stmt: str):
    """Return (prefix, default, named_entries, tail) or None if unparseable /
    must-skip (namespace, comments)."""
    if "* as " in stmt or "*as " in stmt:
        return None
    if "//" in stmt or "/*" in stmt:
        return None
    m = re.match(
        r"^([ \t]*import\s+(?:type\s+)?)([\s\S]*?)(\s+from\s*['\"][^'\"]+['\"];?[ \t]*)$",
        stmt,
    )
    if not m:
        return None
    prefix, clause, tail = m.group(1), m.group(2).strip(), m.group(3)
    default = None
    named = []
    if clause.startswith("{"):
        inner = clause
    elif "{" in clause:
        parts = clause.split(",", 1)
        if len(parts) != 2:
            return None  # unexpected shape (e.g. default fused to brace) — skip
        d, rest = parts
        default = d.strip()
        inner = rest.strip()
    else:
        default = clause.strip()
        inner = None
    if inner is not None:
        inner = inner.strip()
        if inner.startswith("{"):
            inner = inner[1:]
        if inner.endswith("}"):
            inner = inner[:-1]
        named = [e.strip() for e in inner.split(",") if e.strip()]
    return prefix, default, named, tail


def used(name: str, haystack: str) -> bool:
    # JS identifier boundary: not preceded/followed by [\w$].
    return re.search(r"(?<![\w$])" + re.escape(name) + r"(?![\w$])", haystack) is not None


def process(text: str):
    imports = [(mt.start(), mt.end(), mt.group(0)) for mt in IMPORT_RE.finditer(text)]
    if not imports:
        return text, 0, 0
    # Body = file with all import statements blanked (so an import binding used
    # only by another import line doesn't count as "used").
    body_chars = list(text)
    for s, e, _ in imports:
        for i in range(s, e):
            body_chars[i] = " "
    body = "".join(body_chars)

    edits = []
    removed_bindings = 0
    deleted_imports = 0
    for s, e, stmt in imports:
        parsed = parse_clause(stmt)
        if parsed is None:
            continue
        prefix, default, named, tail = parsed
        unused = set()
        if default and not used(default, body):
            unused.add(default)
        kept_named = []
        for entry in named:
            if used(binding_id(entry), body):
                kept_named.append(entry)
            else:
                unused.add(binding_id(entry))
        if not unused:
            continue
        new_default = default if (default and default not in unused) else None
        pieces = []
        if new_default:
            pieces.append(new_default)
        if named and kept_named:
            pieces.append("{ " + ", ".join(kept_named) + " }")
        if not pieces:
            end = e
            if end < len(text) and text[end] == "\n":
                end += 1
            edits.append((s, end, ""))
            deleted_imports += 1
        else:
            repl = f"{prefix.rstrip(chr(10))}{', '.join(pieces)} {tail.strip()}"
            edits.append((s, e, repl))
            removed_bindings += len(unused)

    for s, e, repl in sorted(edits, key=lambda x: x[0], reverse=True):
        text = text[:s] + repl + text[e:]
    return text, removed_bindings, deleted_imports


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    root = sys.argv[1]
    apply = "--apply" in sys.argv

    total_bindings = total_deleted = files_changed = 0
    for dirpath, _dirs, files in os.walk(root):
        if "node_modules" in dirpath:
            continue
        for fn in files:
            if not fn.endswith((".ts", ".tsx")):
                continue
            path = os.path.join(dirpath, fn)
            with open(path, encoding="utf-8") as fh:
                text = fh.read()
            new_text, rb, di = process(text)
            if new_text != text:
                files_changed += 1
                total_bindings += rb
                total_deleted += di
                if apply:
                    with open(path, "w", encoding="utf-8") as fh:
                        fh.write(new_text)

    mode = "APPLIED" if apply else "DRY-RUN"
    print(f"[{mode}] files changed: {files_changed}")
    print(f"  import bindings removed: {total_bindings}")
    print(f"  whole imports deleted: {total_deleted}")


if __name__ == "__main__":
    main()
