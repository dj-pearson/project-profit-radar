#!/usr/bin/env python3
"""Mark a Ralph user story complete in prd.json preserving exact formatting."""
import json
import sys

if len(sys.argv) < 3:
    print("usage: mark-story.py US-XXX 'COMPLETED. note text'")
    sys.exit(1)

story_id = sys.argv[1]
note = sys.argv[2]

with open("prd.json") as f:
    orig = f.read()
data = json.loads(orig)

found = False
for s in data["userStories"]:
    if s["id"] == story_id:
        s["passes"] = True
        s["notes"] = note
        found = True
        break

if not found:
    print(f"story {story_id} not found")
    sys.exit(1)

out = json.dumps(data, indent=2, ensure_ascii=False)
with open("prd.json", "w") as f:
    f.write(out)
print(f"marked {story_id} passes=true")
