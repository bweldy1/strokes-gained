from pathlib import Path
import re
from datetime import datetime

ROOT = Path(__file__).resolve().parent
SOURCE_HTML = ROOT / 'html' / 'app.html'
OUTPUT_HTML = ROOT / 'index.html'

RELATIVE_URL_RE = re.compile(r'^(?!https?:|//).+')
ATTR_VALUE_TEMPLATE = r'{name}\s*=\s*(?:"([^\"]*)"|\'([^\']*)\')'


def get_attr_value(attrs: str, name: str) -> str | None:
    pattern = re.compile(ATTR_VALUE_TEMPLATE.format(name=re.escape(name)), re.I)
    match = pattern.search(attrs)
    return match.group(1) or match.group(2) if match else None


def resolve_includes(html: str) -> str:
    def replace(match: re.Match) -> str:
        path = match.group(1).strip()
        fragment_path = (SOURCE_HTML.parent / path).resolve()
        if not fragment_path.exists():
            raise FileNotFoundError(f'Include not found: {fragment_path}')
        return fragment_path.read_text(encoding='utf-8')

    pattern = re.compile(r'<!--\s*INCLUDE:\s*(.+?)\s*-->', re.I)
    return pattern.sub(replace, html)


def inline_styles(html: str) -> str:
    def replace(match: re.Match) -> str:
        attrs = match.group(1)
        rel = get_attr_value(attrs, 'rel') or ''
        href = get_attr_value(attrs, 'href')
        if not href or 'stylesheet' not in rel.lower() or not RELATIVE_URL_RE.match(href):
            return match.group(0)
        asset_path = (SOURCE_HTML.parent / href).resolve()
        if not asset_path.exists():
            raise FileNotFoundError(f'Stylesheet not found: {asset_path}')
        content = asset_path.read_text(encoding='utf-8')
        return f'<style>\n{content}\n</style>'

    pattern = re.compile(r'<link\s+([^>]*?)>', re.I | re.S)
    return pattern.sub(replace, html)


def inline_scripts(html: str) -> str:
    def replace(match: re.Match) -> str:
        attrs = match.group(1)
        src = get_attr_value(attrs, 'src')
        if not src or not RELATIVE_URL_RE.match(src):
            return match.group(0)
        asset_path = (SOURCE_HTML.parent / src).resolve()
        if not asset_path.exists():
            raise FileNotFoundError(f'Script not found: {asset_path}')
        content = asset_path.read_text(encoding='utf-8')
        return f'<script>\n{content}\n</script>'

    pattern = re.compile(r'<script\s+([^>]*?)>\s*</script>', re.I | re.S)
    return pattern.sub(replace, html)


def build() -> None:
    if not SOURCE_HTML.exists():
        raise FileNotFoundError(f'Input HTML not found: {SOURCE_HTML}')

    html = SOURCE_HTML.read_text(encoding='utf-8')
    html = resolve_includes(html)
    html = inline_styles(html)
    html = inline_scripts(html)
    build_date = datetime.now().strftime('%Y-%m-%d %H:%M')
    html = html.replace('<!-- BUILD_DATE -->', build_date)
    OUTPUT_HTML.write_text(html, encoding='utf-8')
    print(f'Built {OUTPUT_HTML}')


if __name__ == '__main__':
    build()
