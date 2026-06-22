import html
import re


def sanitize_message(text: str, parse_mode: str | None = None) -> str:
    if not text:
        return text
    if parse_mode == "HTML":
        allowed_tags = {"b", "i", "u", "s", "a", "code", "pre", "strong", "em"}
        text = re.sub(r"<(?!/?(" + "|".join(allowed_tags) + r")(?:\s[^>]*)?>)[^>]*>", "", text)
        return text
    return html.escape(text)
