"""
blog_post_renderer.py — Deterministic converters from BlogPostDocument to markdown and HTML.

No LLM involvement. No string parsing. No regex on content.
The BlogPostDocument schema is the single source of truth; these
functions are pure transformations.
"""

from __future__ import annotations

from pathlib import Path

import markdown as md_lib
from jinja2 import Environment, FileSystemLoader

from configs.settings import get_settings
from core.orchestration.blog_post_schema import BlogPostDocument

_settings       = get_settings()
_TEMPLATE_DIR   = Path(__file__).parents[1] / "templates" / "blog"
_jinja_env      = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), autoescape=False)


def inject_images(doc: BlogPostDocument, image_pool: list[dict]) -> BlogPostDocument:
    """Fill ImageSlot.url fields from the image pool.

    Sections that have an image slot (the LLM declared one) receive an image
    from the pool in order. Sections without a slot are skipped.
    The original doc is not mutated — a new BlogPostDocument is returned.
    """
    pool = list(image_pool)  # defensive copy
    updated_sections = []
    for section in doc.sections:
        if section.image is not None and pool:
            img = pool.pop(0)
            url = img.get("url") or img.get("local_url") or img.get("original_url")
            caption = section.image.caption or img.get("caption") or ""
            alt     = section.image.alt or img.get("alt") or section.heading
            updated_sections.append(section.model_copy(
                update={"image": section.image.model_copy(update={"url": url, "caption": caption, "alt": alt})}
            ))
        else:
            updated_sections.append(section)

    return doc.model_copy(update={"sections": updated_sections})


def to_markdown(doc: BlogPostDocument) -> str:
    """Convert a BlogPostDocument to clean markdown.

    Pure function — no side effects, no file I/O.
    """
    lines: list[str] = []

    # Title and subtitle
    lines.append(f"# {doc.title}")
    if doc.subtitle:
        lines.append(f"**{doc.subtitle}**")
    lines.append("")

    # Intro
    lines.append(doc.intro)
    lines.append("")

    # Body sections
    for section in doc.sections:
        lines.append(f"## {section.heading}")
        lines.append("")

        if section.pull_quote:
            lines.append(f"> {section.pull_quote}")
            lines.append("")

        for para in section.paragraphs:
            lines.append(para)
            lines.append("")

        if section.image and section.image.url:
            alt = section.image.alt or section.heading
            lines.append(f"![{alt}]({section.image.url})")
            if section.image.caption:
                lines.append(f"*{section.image.caption}*")
            lines.append("")

    # Key findings
    lines.append("## Key Findings")
    lines.append("")
    for finding in doc.key_findings:
        lines.append(f"- {finding}")
    lines.append("")

    # CTA
    lines.append("---")
    lines.append("")
    lines.append(doc.cta_text)
    lines.append("")

    # Brand footer
    lines.append(
        f"*Originally produced by "
        f"[{_settings.instagram_handle}]({_settings.instagram_url}) · "
        f"[Blogger]({_settings.blogger_url}) · "
        f"[Medium]({_settings.medium_url})*"
    )
    lines.append("")

    # Tags
    if doc.tags:
        tag_line = " ".join(f"\\#{t}" for t in doc.tags)
        lines.append(tag_line)

    return "\n".join(lines)


def to_html(doc: BlogPostDocument) -> str:
    """Convert a BlogPostDocument to a full HTML page.

    Renders markdown → HTML body, then wraps in the blog_post.html.j2 template.
    The <title> tag is set directly from doc.title — no extraction needed.
    """
    md = to_markdown(doc)
    body_html = md_lib.markdown(md, extensions=["extra", "tables", "toc"])
    template = _jinja_env.get_template("blog_post.html.j2")
    return template.render(title=doc.title, body_html=body_html)
