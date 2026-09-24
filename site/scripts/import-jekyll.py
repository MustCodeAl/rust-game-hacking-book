#!/usr/bin/env python3
"""Import the Jekyll book into the Starlight site.

Re-runnable: it regenerates site/src/content/docs/{pages,glossary.mdx} and
site/src/data/lesson-quizzes.json from the Jekyll sources every time.

Usage: python3 import_jekyll.py /path/to/repo
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
SRC = ROOT / "_pages"
DOCS = ROOT / "site/src/content/docs"
DATA = ROOT / "site/src/data"
BASE = "/rust-game-hacking-book"

INCLUDE = re.compile(r"\{%-?\s*include\s+([\w.-]+)(.*?)-?%\}", re.S)
ATTR = re.compile(r'(\w+)=(?:"([^"]*)"|([^\s"]+))')
IAL = re.compile(r"^\{:\s*\.([\w-]+)\s*\}\s*$")
FENCE = re.compile(r"^(\s*)(```|~~~)")
COMPONENTS = {
    "memory-strip.html": "MemoryStrip",
    "quiz.html": "Quiz",
    "concept-lab.html": "ConceptLab",
    "ownership-scope.html": "OwnershipScope",
    "perspective-playground.html": "PerspectivePlayground",
}
ASIDES = {"block-danger": "danger", "block-warning": "caution", "block-tip": "tip", "block-why": "note", "emoji-note": "note"}


def yaml_to_json(texts):
    """Parse several YAML documents with Ruby's YAML (always present beside Jekyll)."""
    script = "require 'yaml'; require 'json'; require 'date'; docs = JSON.parse(STDIN.read); puts JSON.generate(docs.map { |d| YAML.safe_load(d, permitted_classes: [Date]) })"
    result = subprocess.run(["ruby", "-e", script], input=json.dumps(texts), capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def split_front_matter(text):
    if not text.startswith("---\n"):
        return "", text
    end = text.index("\n---\n", 4)
    return text[4:end], text[end + 5:]


def jsx_value(value):
    if '"' in value:
        return "{" + json.dumps(value, ensure_ascii=False) + "}"
    return f'"{value}"'


def include_to_jsx(name, attr_text, used):
    component = COMPONENTS.get(name)
    if component is None:
        raise SystemExit(f"unknown include {name}")
    used.add(component)
    props = []
    for match in ATTR.finditer(attr_text):
        key = match.group(1)
        value = match.group(2) if match.group(2) is not None else match.group(3)
        if value == "true" and match.group(3) is not None:
            props.append(key)
        else:
            props.append(f"{key}={jsx_value(value)}")
    inner = "\n  ".join(props)
    return f"<{component}\n  {inner}\n/>"


def escape_prose_braces(line):
    """MDX treats { and } as JavaScript; escape them outside inline code."""
    parts = re.split(r"(`[^`]*`)", line)
    return "".join(part if part.startswith("`") else part.replace("{", "\\{").replace("}", "\\}") for part in parts)


def convert_body(body):
    used = set()
    # Components first, across line breaks, before the line-by-line pass.
    body = body.replace("{{ site.baseurl }}", "").replace("{{site.baseurl}}", "")
    placeholders = []

    def keep(match):
        placeholders.append(include_to_jsx(match.group(1), match.group(2), used))
        return f"\x00JSX{len(placeholders) - 1}\x00"

    # Only convert includes outside fenced code.
    # CommonMark fences: an opener is ``` or ~~~ (3+), and only a line holding
    # nothing but the same character, at least as long, closes it. A row of
    # ~~~~ underlining inside a ```text block therefore stays code.
    out_chunks, fence = [], None
    lines = body.split("\n")
    buffer = []
    for line in lines:
        if fence is None:
            opener = re.match(r"^(\s*)(`{3,}|~{3,})(.*)$", line)
            if opener and not (opener.group(2)[0] == "`" and "`" in opener.group(3)):
                out_chunks.append(("text", "\n".join(buffer)))
                buffer = [line]
                fence = (opener.group(2)[0], len(opener.group(2)))
                continue
            buffer.append(line)
        else:
            buffer.append(line)
            closer = re.match(r"^\s*(`{3,}|~{3,})\s*$", line)
            if closer and closer.group(1)[0] == fence[0] and len(closer.group(1)) >= fence[1]:
                out_chunks.append(("code", "\n".join(buffer)))
                buffer, fence = [], None
    out_chunks.append(("code" if fence else "text", "\n".join(buffer)))

    converted = []
    for kind, chunk in out_chunks:
        if kind == "code":
            converted.append(chunk)
            continue
        chunk = INCLUDE.sub(keep, chunk)
        result = []
        for line in chunk.split("\n"):
            ial = IAL.match(line)
            if ial:
                apply_ial(result, ial.group(1))
                continue
            if "\x00JSX" in line:
                result.append(line)
                continue
            line = re.sub(r"<br\s*>", "<br />", line)
            line = re.sub(r"<hr\s*>", "<hr />", line)
            line = line.replace(' markdown="1"', "")
            stripped = line.lstrip()
            if not stripped.startswith("<") and ("{" in line or "}" in line):
                line = escape_prose_braces(line)
            result.append(line)
        converted.append("\n".join(result))
    text = "\n".join(converted)
    text = re.sub(r"\x00JSX(\d+)\x00", lambda m: placeholders[int(m.group(1))], text)
    return text, used


def apply_ial(result, cls):
    """Wrap the block just emitted (lines since the last blank line)."""
    end = len(result)
    while end > 0 and not result[end - 1].strip():
        end -= 1
    start = end
    while start > 0 and result[start - 1].strip():
        start -= 1
    block = result[start:end]
    if cls == "diagram-on-dark":
        new = ['<div class="diagram-on-dark">', ""] + block + ["", "</div>"]
    elif cls in ASIDES:
        kind = ASIDES[cls]
        if all(l.startswith(">") for l in block):
            block = [re.sub(r"^> ?", "", l) for l in block]
        title = ""
        heading = re.match(r"^\*\*(.+?)\*\*\s*(.*)$", block[0]) if block else None
        if cls == "block-why" and heading:
            title = f"[{heading.group(1).rstrip()}]"
            block = [heading.group(2)] + block[1:] if heading.group(2) else block[1:]
        new = [f":::{kind}{title}"] + block + [":::"]
    else:
        raise SystemExit(f"unknown IAL class {cls}")
    result[start:end] = new


def front_matter(meta, chapter_str):
    chapter, lesson = chapter_str.split(".")
    lines = ["---", f"title: {json.dumps(meta['title'], ensure_ascii=False)}"]
    if meta.get("summary"):
        lines.append(f"description: {json.dumps(meta['summary'], ensure_ascii=False)}")
    lines.append(f'chapter: "{chapter_str}"')
    if meta.get("minutes"):
        lines.append(f"minutes: {int(meta['minutes'])}")
    if meta.get("author"):
        lines.append(f"author: {json.dumps(meta['author'])}")
    if meta.get("date"):
        lines.append(f'date: "{meta["date"]}"')
    lines += ["sidebar:", f"  order: {int(lesson)}", f"  label: {json.dumps(chapter_str + ' ' + meta['title'], ensure_ascii=False)}", "---", ""]
    return "\n".join(lines)


def imports_for(used, depth):
    prefix = "../" * depth + "components/"
    return "".join(f"import {name} from '{prefix}{name}.astro';\n" for name in sorted(used))


def main():
    lesson_files = sorted(p for p in SRC.glob("[0-9][0-9]-*/*.md"))
    raw = [p.read_text() for p in lesson_files]
    metas = yaml_to_json([split_front_matter(t)[0] for t in raw])
    written = 0
    pages_dir = DOCS / "pages"
    for path, text, meta in zip(lesson_files, raw, metas):
        chapter_str = str(meta["chapter"])
        chapter, lesson = chapter_str.split(".")
        _, body = split_front_matter(text)
        converted, used = convert_body(body)
        target = pages_dir / chapter / f"{int(lesson):02d}.mdx"
        target.parent.mkdir(parents=True, exist_ok=True)
        # site/src/content/docs/pages/<n>/<nn>.mdx -> site/src/components is 4 levels up.
        header = front_matter(meta, chapter_str)
        imports = imports_for(used, 4)
        target.write_text(header + (imports + "\n" if imports else "") + converted.lstrip("\n"))
        written += 1

    # Glossary.
    gtext = (SRC / "glossary.md").read_text()
    gmeta_raw, gbody = split_front_matter(gtext)
    gconverted, _ = convert_body(gbody)
    (DOCS / "glossary.mdx").write_text(
        "---\ntitle: Glossary\ndescription: Plain-English definitions and distinctions for the terms used across the book.\n"
        "tableOfContents: false\nhideTitle: true\n---\n\n" + gconverted.lstrip("\n"))

    # Lesson-end quizzes.
    DATA.mkdir(parents=True, exist_ok=True)
    quizzes = yaml_to_json([(ROOT / "_data/lesson_quizzes.yml").read_text()])[0]
    (DATA / "lesson-quizzes.json").write_text(json.dumps(quizzes, indent=2, ensure_ascii=False) + "\n")
    print(f"lessons: {written}, quizzes: {len(quizzes)}")


if __name__ == "__main__":
    main()
