import html
from html.parser import HTMLParser
from urllib.parse import urlsplit

# Telegram HTML parse-mode subset. Attributes are stripped everywhere except
# an allowlisted <a href="..."> with a safe URL scheme.
_ALLOWED_TAGS = {"b", "strong", "i", "em", "u", "ins", "s", "strike", "del", "a", "code", "pre", "blockquote"}
_ALLOWED_HREF_SCHEMES = {"http", "https", "tg", "mailto", "tel"}


class _Sanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=False)
        self._out: list[str] = []
        self._open_tags: list[str] = []

    def get_output(self) -> str:
        for tag in reversed(self._open_tags):
            self._out.append(f"</{tag}>")
        self._open_tags.clear()
        return "".join(self._out)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag not in _ALLOWED_TAGS:
            return
        if tag == "a":
            href = next((v for k, v in attrs if k == "href" and v), None)
            if not href or urlsplit(href).scheme.lower() not in _ALLOWED_HREF_SCHEMES:
                # Unsafe or missing href: drop the tag, keep the inner text.
                return
            self._out.append(f'<a href="{html.escape(href, quote=True)}">')
        else:
            self._out.append(f"<{tag}>")
        self._open_tags.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag not in _ALLOWED_TAGS or tag not in self._open_tags:
            return
        # Close any still-open nested tags first to keep the markup balanced.
        while self._open_tags:
            open_tag = self._open_tags.pop()
            self._out.append(f"</{open_tag}>")
            if open_tag == tag:
                break

    def handle_data(self, data: str) -> None:
        self._out.append(html.escape(data))

    def handle_entityref(self, name: str) -> None:
        self._out.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self._out.append(f"&#{name};")


def sanitize_message(text: str, parse_mode: str | None = None) -> str:
    if not text:
        return text
    if parse_mode == "HTML":
        parser = _Sanitizer()
        parser.feed(text)
        parser.close()
        return parser.get_output()
    return html.escape(text)
