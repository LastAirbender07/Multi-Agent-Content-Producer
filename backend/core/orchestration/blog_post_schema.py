"""
blog_post_schema.py — Pydantic schema for structured LLM blog post output.

The LLM is asked to produce a BlogPostDocument JSON object instead of free-form
markdown. This makes the output deterministic and validates it before rendering.

The validated JSON is saved to disk at:
    runs/{run_id}/blog/blog_post.json

Then rendered to:
    runs/{run_id}/blog/blog_post.md
    runs/{run_id}/blog/blog_post.html
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ImageSlot(BaseModel):
    """An image to illustrate a section. URL is filled in by the pipeline after LLM output."""
    alt:     str        = Field(description="Descriptive alt text for accessibility (required)")
    caption: str | None = Field(default=None, description="Optional caption shown below the image")
    url:     str | None = Field(default=None, description="Filled by the pipeline — leave blank")


class Section(BaseModel):
    """One body section of the blog post."""
    heading:    str              = Field(description="Section heading, 3–8 words")
    paragraphs: list[str]        = Field(
        min_length=1, max_length=6,
        description="2–4 prose paragraphs for this section. Each paragraph is a single string."
    )
    image:      ImageSlot | None = Field(
        default=None,
        description="Optional image slot. Include when this section benefits from visual support. Leave url blank."
    )
    pull_quote: str | None       = Field(
        default=None,
        description="Optional pull quote — the single most striking sentence from this section (≤25 words)"
    )


class BlogPostDocument(BaseModel):
    """
    Structured blog post produced by the LLM.
    All fields are plain text — no markdown syntax, no HTML tags.
    The renderer adds all formatting.
    """
    title:         str        = Field(description="SEO-optimised headline, 6–12 words, no punctuation at end")
    subtitle:      str | None = Field(default=None, description="Optional subtitle — one sentence, creates urgency or curiosity")
    intro:         str        = Field(description="Opening hook paragraph, 100–200 words. Why this matters right now.")
    sections:      list[Section] = Field(
        min_length=4, max_length=10,
        description="4–8 body sections forming the article. Each covers one distinct aspect of the topic."
    )
    key_findings:  list[str]  = Field(
        min_length=2, max_length=5,
        description="3–5 concrete takeaways the reader should remember. Short, punchy statements."
    )
    cta_text:      str        = Field(description="Call-to-action sentence encouraging the reader to follow/engage")
    tags:          list[str]  = Field(
        min_length=3, max_length=8,
        description="5–8 topic tags without the # prefix (e.g. 'IndianPassport' not '#IndianPassport')"
    )
