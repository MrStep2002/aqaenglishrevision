#!/usr/bin/env python3
"""
One-off importer: Google Sites export (Takeout "DRAFT" folder) -> Eleventy source.

Usage:
  python3 convert_google_sites.py <export DRAFT dir> <site src dir> <secstyles.json> [--images]

Writes one clean .html content file per page (with front matter) under <site src dir>,
custom quiz embeds under <site src dir>/assets/embeds/, the menu to _data/nav.json,
and an image manifest (export path -> site path). With --images it also resizes and
copies the images (needs Pillow).
"""
import html
import json
import os
import re
import sys
import urllib.parse
from collections import defaultdict, Counter

from bs4 import BeautifulSoup, NavigableString, Tag

SRC, OUT, STYLES = sys.argv[1], sys.argv[2], sys.argv[3]
DO_IMAGES = '--images' in sys.argv
STY = json.load(open(STYLES))

# Google Sites column-width codes -> 12-column spans (decoded from the export).
SPAN = {'R6PoUb': 1, 'ibL1re': 2, 'c5RTEf': 3, 'II5mzb': 4, 'wNfPc': 5, 'qWD73c': 6,
        'OwsYgb': 7, 'OiUrBf': 8, 'Clt0zb': 9, 'EehZO': 10, 'zQtlcf': 11, 'uQSCkd': 12}

# Export file -> URL path. Paths match the live Google Site (taken from the March 2026
# static copy in the repo history); pages that copy didn't include follow the same scheme.
def _s(prefix, names):
    out = {}
    for n in names:
        slug = re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')
        out[n + '.html'] = f'{prefix}/{slug}' if prefix else slug
    return out

PAGES = {
    'Home.html': '',
    'Teachers Corner.html': 'teachers-corner',
    **_s('teachers-corner', ['A Short History', 'Flash Fiction', 'Page Turners', 'Siege of Troy',
                             'Talking About Ai', 'The Whole Lot', 'Miss']),
    'A Christmas Carol.html': 'a-christmas-carol',
    'Plot_1.html': 'a-christmas-carol/plot',
    'Characters_1.html': 'a-christmas-carol/characters',
    'Context_1.html': 'a-christmas-carol/context',
    **_s('a-christmas-carol', ['Change', 'Christmas', 'Compassion', 'Family', 'Greed', 'Social Injustice']),
    'Essays_1.html': 'a-christmas-carol/essays',
    'Revision Essay Titles_1.html': 'a-christmas-carol/revision-essay-titles',
    'Key Quotes.html': 'a-christmas-carol/key-quotes',
    'Games_2.html': 'a-christmas-carol/games',
    'ACC - Curve balls.html': 'a-christmas-carol/acc-curve-balls',
    'An Inspector Calls.html': 'an-inspector-calls',
    'Plot.html': 'an-inspector-calls/plot',
    'Characters.html': 'an-inspector-calls/characters',
    'Context_2.html': 'an-inspector-calls/context',
    **_s('an-inspector-calls', ['Age', 'Capitalism vs Socialism', 'Class', 'Dramatic Techniques',
                                'Responsibility', 'Gender']),
    'Essays_2.html': 'an-inspector-calls/essays',
    'Revision Essay titles.html': 'an-inspector-calls/revision-essay-titles',
    'Key Quotes_2.html': 'an-inspector-calls/key-quotes',
    'Games_1.html': 'an-inspector-calls/games',
    'In a nutshell.html': 'an-inspector-calls/in-a-nutshell',
    'AIC - Curveballs.html': 'an-inspector-calls/aic-curveballs',
    'Macbeth.html': 'macbeth',
    'Videos.html': 'macbeth/videos',
    'Plot_2.html': 'macbeth/plot',
    'Characters_2.html': 'macbeth/characters',
    'Character - Macbeth.html': 'macbeth/characters/character-macbeth',
    'Character - Lady Macbeth.html': 'macbeth/characters/character-lady-macbeth',
    'Context.html': 'macbeth/context',
    'Macbeth and Feminism.html': 'macbeth/context/macbeth-and-feminism',
    **_s('macbeth', ['Ambition', 'Guilt', 'The Natural Order', 'Appearance', 'Supernatural']),
    'Macbeth and Adam and Eve.html': 'macbeth/supernatural/macbeth-and-adam-and-eve',
    'Gender_1.html': 'macbeth/gender',
    'Macbeth and Oedipus.html': 'macbeth/gender/macbeth-and-oedipus',
    'Essays.html': 'macbeth/essays',
    **_s('macbeth/essays', ['Lady Macbeth as powerful', 'Macbeth as a strong man', 'Macbeth and Gender',
                            'Macbeth and Ambition']),
    'Revision Essay Titles(1).html': 'macbeth/revision-essay-titles',
    'Key Quotes_1.html': 'macbeth/key-quotes',
    'Challenges to the readings.html': 'macbeth/challenges-to-the-readings',
    'Games.html': 'macbeth/games',
    'Lang Paper 1.html': 'lang-paper-1',
    'Q1 Comprehension_1.html': 'lang-paper-1/q1-comprehension',
    'Q2 Analysis.html': 'lang-paper-1/q2-analysis',
    'Q3 Structure.html': 'lang-paper-1/q3-structure',
    'Q4 Personal Response.html': 'lang-paper-1/q4-personal-response',
    'P1 - Description.html': 'lang-paper-1/p1-description',
    '1 Get Moody.html': 'lang-paper-1/p1-description/1-get-moody',
    '2 The Zonal System.html': 'lang-paper-1/p1-description/2-the-zonal-system',
    '3 Using the Senses.html': 'lang-paper-1/p1-description/3-using-the-senses',
    '4 A-Z of Sentences.html': 'lang-paper-1/p1-description/4-a-z-of-sentences',
    '5 Bringing it all together.html': 'lang-paper-1/p1-description/5-bringing-it-all-together',
    '6 Pics  Tips.html': 'lang-paper-1/p1-description/6-pics-tips',
    'P1 - Short Story.html': 'lang-paper-1/p1-short-story',
    **_s('lang-paper-1/p1-short-story', ['A Cold Kitchen', 'Perspectives', 'The Voices', 'For Sale Baby Shoes',
                                         'Wanderlust', 'The Garden']),
    'Lang Paper 2.html': 'lang-paper-2',
    'Q1 Comprehension.html': 'lang-paper-2/q1-comprehension',
    'Q2 Comparison.html': 'lang-paper-2/q2-comparison',
    'Q3 Analysis.html': 'lang-paper-2/q3-analysis',
    'Q4 Comparison of Style.html': 'lang-paper-2/q4-comparison-of-style',
    'P2 - Creative Writing.html': 'lang-paper-2/p2-creative-writing',
    'Random Ideas_.html': 'lang-paper-2/random-ideas',
    **_s('lang-paper-2/random-ideas', ['The Free Market', 'Extremism', 'The Environment']),
    'Left  Right.html': 'lang-paper-2/random-ideas/left-right',
    'Discussion and Discourse.html': 'lang-paper-2/discussion-and-discourse',
    'Discussion and Discourse II.html': 'lang-paper-2/discussion-and-discourse-ii',
    'How to Revise.html': 'how-to-revise',
    'Literature AOs.html': 'how-to-revise/literature-aos',
    'Classroom links.html': 'how-to-revise/classroom-links',
    'Writing Skills.html': 'how-to-revise/writing-skills',
    'Unseen Poetry.html': 'unseen-poetry',
    **_s('unseen-poetry', ['Time', 'Seasons', 'Growing up', 'Rorschach Test', 'Tissue analysis']),
    'Covid-19 Poems.html': 'unseen-poetry/covid-19-poems',
    'Who am I.html': 'who-am-i',
}
# Test/scratch pages: kept in the repo, shown when previewing locally, left out of the live build.
DRAFTS = {'Game Test.html', 'Maths Game.html', 'Learn Chinese.html', 'Quizzes.html',
          'Revision Games_.html', 'Trolls.html'}
for d in DRAFTS:
    PAGES[d] = 'drafts/' + re.sub(r'[^a-z0-9]+', '-', d[:-5].lower()).strip('-')

DEFAULT_COLOURS = {'#000000', '#212121', '#333333', '#202124', '#222222', '#111111'}
LOG = defaultdict(list)


def url_for(path):
    return '/' + path if path else '/'


def unwrap_google(u):
    if not u:
        return u
    m = re.match(r'https?://www\.google\.com/url\?q=([^&]+)', u)
    if m:
        return urllib.parse.unquote(m.group(1))
    return u


def map_href(href, page):
    if not href:
        return None
    href = unwrap_google(href)
    if href.startswith(('http://', 'https://', 'mailto:', 'tel:')):
        return href
    if href.startswith('#'):
        return href
    target, _, frag = href.partition('#')
    fn = urllib.parse.unquote(target)
    if fn in PAGES:
        return url_for(PAGES[fn]) + ('#' + frag if frag else '')
    if fn == 'Revision Essay Titles.html':  # Macbeth's page, renamed by the export (case clash)
        return url_for(PAGES['Revision Essay Titles(1).html'])
    LOG['unmapped-link'].append((page, href))
    return href


# ---------------------------------------------------------------- images
IMG_USES = defaultdict(set)   # export rel path -> pages using it
IMG_KIND = {}                 # export rel path -> 'banner' | 'content' | 'carousel'


_HASH_PAGES = defaultdict(set)


def register_img(rel, page, kind):
    rel = urllib.parse.unquote(rel)
    IMG_USES[rel].add(page)
    _HASH_PAGES[os.path.basename(rel)].add(page)
    if IMG_KIND.get(rel) != 'banner':
        IMG_KIND[rel] = kind
    return rel


# ---------------------------------------------------------------- inline text
def style_of(tag):
    return tag.get('style', '') if isinstance(tag, Tag) else ''


def runs_of(node, inherited, page, link=None, out=None):
    """Flatten inline content into runs: (text|'\\n', frozenset(styles), link)."""
    if out is None:
        out = []
    if isinstance(node, NavigableString):
        if node.__class__.__name__ in ('Comment',):
            return out
        t = str(node)
        if t:
            out.append((t, inherited, link))
        return out
    if not isinstance(node, Tag):
        return out
    name = node.name
    if name == 'br':
        out.append(('\n', inherited, link))
        return out
    if name in ('script', 'style', 'svg'):
        return out
    st = set(inherited)
    css = style_of(node)
    if name in ('b', 'strong') or re.search(r'font-weight:\s*(700|bold|[89]00)', css):
        st.add('b')
    if re.search(r'font-weight:\s*(400|normal)', css):
        st.discard('b')
    if name in ('i', 'em') or 'font-style: italic' in css:
        st.add('i')
    if 'font-style: normal' in css:
        st.discard('i')
    if name == 'u' or re.search(r'text-decoration:[^;]*underline', css):
        st.add('u')
    if re.search(r'text-decoration:\s*none', css):
        st.discard('u')
    if re.search(r'text-decoration:[^;]*line-through', css):
        st.add('s')
    if 'vertical-align: super' in css or name == 'sup':
        st.add('sup')
    if 'vertical-align: sub' in css or name == 'sub':
        st.add('sub')
    m = re.search(r'(?<![-\w])color:\s*(#[0-9a-fA-F]{3,6}|rgb[^;]+)', css)
    if m:
        col = m.group(1).lower()
        st = {s for s in st if not s.startswith('c:')}
        if col not in DEFAULT_COLOURS:
            st.add('c:' + col)
    if name == 'a':
        href = map_href(node.get('href'), page)
        link = href or link
        st = {s for s in st if s != 'u' and not s.startswith('c:')}
    for c in node.children:
        runs_of(c, frozenset(st), page, link, out)
    return out


def emit_runs(runs, in_heading=False):
    """Turn runs into tidy HTML, merging adjacent runs with the same formatting."""
    merged = []
    for t, st, link in runs:
        if link:   # links get their own styling; drop pasted underline/colour
            st = frozenset(x for x in st if x != 'u' and not x.startswith('c:'))
        if in_heading:
            st = frozenset(s for s in st if s != 'b')
        if merged and merged[-1][1] == st and merged[-1][2] == link:
            merged[-1] = (merged[-1][0] + t, st, link)
        else:
            merged.append((t, st, link))
    # trim outer whitespace
    while merged and not merged[0][0].strip('  ') and merged[0][0] != '\n':
        merged.pop(0)
    while merged and not merged[-1][0].strip('  \n'):
        merged.pop()
    if merged:
        merged[0] = (merged[0][0].lstrip(' '), merged[0][1], merged[0][2])
        merged[-1] = (merged[-1][0].rstrip(' \n'), merged[-1][1], merged[-1][2])

    def fmt(t, st):
        parts = t.split('\n')
        s = '<br>\n'.join(html.escape(p, quote=False) for p in parts)
        if not t.strip():
            return s
        for c in sorted(x for x in st if x.startswith('c:')):
            s = f'<span style="color:{c[2:]}">{s}</span>'
        for tag in ('sub', 'sup', 's', 'u', 'i', 'b'):
            if tag in st:
                real = {'b': 'strong', 'i': 'em'}.get(tag, tag)
                s = f'<{real}>{s}</{real}>'
        return s

    outp = []
    i = 0
    while i < len(merged):
        link = merged[i][2]
        j = i
        while j < len(merged) and merged[j][2] == link:
            j += 1
        inner = ''.join(fmt(t, st) for t, st, _ in merged[i:j])
        if link:
            ext = link.startswith('http')
            attrs = f' href="{html.escape(link)}"'
            if ext:
                attrs += ' target="_blank" rel="noopener"'
            outp.append(f'<a{attrs}>{inner}</a>')
        else:
            outp.append(inner)
        i = j
    return ''.join(outp)


BLOCK_MAP = {'h1': 'h2', 'h2': 'h3', 'h3': 'p', 'p': 'p'}


def align_cls(tag):
    m = re.search(r'text-align:\s*(center|right)', style_of(tag))
    return {'center': 'tc', 'right': 'tr'}[m.group(1)] if m else None


def convert_block(b, page, banner=False):
    name = b.name
    if banner and name == 'h1':
        out_tag = 'h1'
    else:
        out_tag = BLOCK_MAP.get(name, 'p')
    classes = []
    if name == 'p':
        classes.append('sm')
    a = align_cls(b)
    if a:
        classes.append(a)
    runs = runs_of(b, frozenset(), page)
    if out_tag.startswith('h'):
        texty = [st for t, st, _ in runs if t.strip()]
        if texty and all('b' in st for st in texty):
            inner = emit_runs(runs, in_heading=True)   # bold is the default for headings
        else:
            classes.append('nb')                        # this heading isn't bold in the original
            inner = emit_runs(runs)
    else:
        inner = emit_runs(runs)
    if not re.sub(r'<br>\s*', '', inner).strip('  \n'):
        return None
    cls = f' class="{" ".join(classes)}"' if classes else ''
    return f'<{out_tag}{cls}>{inner}</{out_tag}>'


def convert_list(lst, page):
    items = []
    for li in lst.find_all('li', recursive=False):
        sub = [c for c in li.find_all(['ul', 'ol'], recursive=False)]
        for s in sub:
            s.extract()
        inner = emit_runs(runs_of(li, frozenset(), page))
        nested = ''.join(convert_list(s, page) for s in sub)
        if inner.strip() or nested:
            items.append(f'<li>{inner}{nested}</li>')
    if not items:
        return ''
    tag = lst.name
    return f'<{tag}>\n' + '\n'.join(items) + f'\n</{tag}>'


def convert_textbox(box, page, banner=False):
    out = []

    def walk(el):
        for c in el.children:
            if not isinstance(c, Tag):
                if str(c).strip():
                    out.append(f'<p>{html.escape(str(c).strip())}</p>')
                continue
            if c.name in ('h1', 'h2', 'h3', 'p'):
                r = convert_block(c, page, banner)
                if r:
                    out.append(r)
            elif c.name in ('ul', 'ol'):
                r = convert_list(c, page)
                if r:
                    out.append(r)
            elif c.name == 'small':
                r = emit_runs(runs_of(c, frozenset(), page))
                if r.strip():
                    out.append(f'<p class="xs">{r}</p>')
            elif c.name == 'div':
                walk(c)
            elif c.name in ('table',):
                out.append(str(c))
                LOG['table'].append(page)
            elif c.name == 'br':
                continue  # spacing between paragraphs
            elif c.name in ('hr',):
                out.append('<hr>')
            else:
                LOG['unknown-in-textbox'].append((page, c.name))
                r = emit_runs(runs_of(c, frozenset(), page))
                if r.strip():
                    out.append(f'<p>{r}</p>')
    walk(box)
    return '\n'.join(out)


# ---------------------------------------------------------------- leaves
def convert_image(leaf, page):
    img = leaf.find('img')
    if not img or not img.get('src'):
        return ''
    rel = register_img(img['src'], page, 'content')
    style = img.get('style', '').strip().rstrip(';')
    a = leaf.find('a', class_='fqo2vd') or (img.find_parent('a'))
    src_tok = f'@@IMG:{rel}@@'
    im = f'<img src="{src_tok}" alt="" loading="lazy" style="{html.escape(style)}">'
    if a and a.get('href'):
        href = map_href(a['href'], page)
        ext = href.startswith('http')
        attrs = f' href="{html.escape(href)}"' + (' target="_blank" rel="noopener"' if ext else '')
        im = f'<a{attrs}>{im}</a>'
    return f'<figure class="img">{im}</figure>'


def ratio_of(el):
    pad = el.find(attrs={'jsname': 'WXxXjd'})
    if pad:
        m = re.search(r'padding-top:\s*([\d.]+)%', pad.get('style', ''))
        if m and float(m.group(1)) > 0:
            return round(100 / float(m.group(1)), 4)
    return None


EMBED_COUNT = Counter()


def iframe_html(src, ratio, title='', extra_cls=''):
    style = f' style="--ratio:{ratio}"' if ratio else ''
    cls = 'embed' + (' ' + extra_cls if extra_cls else '')
    t = f' title="{html.escape(title)}"' if title else ''
    return (f'<div class="{cls}"{style}><iframe src="{html.escape(src)}"{t} loading="lazy" '
            f'allowfullscreen allow="autoplay; encrypted-media; fullscreen"></iframe></div>')


def clean_embed_src(src):
    src = unwrap_google(src)
    m = re.match(r'https://www\.youtube\.com/embed/([\w-]+)', src or '')
    if m:
        return f'https://www.youtube-nocookie.com/embed/{m.group(1)}'
    return src


def convert_embed(leaf, page):
    box = leaf.find(class_=['WIdY2d', 'zGRpZc'])
    if box is None:
        LOG['embed-unknown'].append(page)
        return ''
    if 'zGRpZc' in box.get('class', []):
        a = box.find('a')
        if not a:
            return ''
        href = map_href(a.get('href'), page)
        thumb = box.find('img')
        spans = box.select('span.nWW5Nb')
        if thumb:
            title = spans[0].get_text(' ', strip=True) if spans else href
            desc = spans[1].get_text(' ', strip=True) if len(spans) > 1 else ''
            return (f'<a class="card" href="{html.escape(href)}" target="_blank" rel="noopener">'
                    f'<img src="{html.escape(thumb["src"])}" alt="" loading="lazy" onerror="this.remove()">'
                    f'<span class="card-text"><span class="card-title">{html.escape(title)}</span>'
                    f'<span class="card-desc">{html.escape(desc)}</span></span></a>')
        return f'<p><a href="{html.escape(href)}" target="_blank" rel="noopener">{html.escape(a.get_text(" ", strip=True))}</a></p>'
    ratio = ratio_of(box)
    code_el = box.find(attrs={'data-code': True})
    if code_el:
        code = code_el['data-code']
        frames = re.findall(r'<iframe\b[^>]*>', code, re.I)
        stripped = re.sub(r'<iframe\b[^>]*>\s*</iframe>', '', code, flags=re.I).strip()
        if len(frames) == 1 and not stripped:
            src = re.search(r'src="([^"]+)"', frames[0])
            if src:
                kind = 'audio' if 'drive.google.com' in src.group(1) and ratio and ratio > 3 else ''
                return iframe_html(clean_embed_src(src.group(1)), ratio, extra_cls=kind)
        EMBED_COUNT[page] += 1
        slug = (PAGES[page] or 'home').replace('/', '--')
        fname = f'{slug}-{EMBED_COUNT[page]}.html'
        EMBEDS[fname] = code
        return iframe_html(f'/assets/embeds/{fname}', ratio, extra_cls='app')
    ifr = box.find('iframe')
    if ifr and ifr.get('src'):
        title = (ifr.get('aria-label') or '').replace('YouTube Video, ', '')
        src = clean_embed_src(ifr['src'])
        extra = 'form' if 'docs.google.com/forms' in src else ''
        if not ratio and extra != 'form':
            ratio = 1.7778
        return iframe_html(src, ratio, title=title, extra_cls=extra)
    open_url = box.get('data-embed-open-url')
    if open_url:
        return f'<p><a href="{html.escape(open_url)}" target="_blank" rel="noopener">Open document</a></p>'
    LOG['embed-unhandled'].append(page)
    return ''


def convert_carousel(leaf, page):
    car = leaf.find(class_='mr3rhf')
    imgs = []
    for d in car.select('.nQBJnb'):
        m = re.search(r'url\(([^)]+)\)', d.get('style', ''))
        if m:
            rel = register_img(m.group(1).strip('\'"'), page, 'carousel')
            imgs.append(f'<img src="@@IMG:{rel}@@" alt="" loading="lazy">')
    m = re.search(r'aspect-ratio:\s*([\d.]+)', car.get('style', ''))
    ratio = f' style="--ratio:{round(float(m.group(1)), 4)}"' if m else ''
    return f'<div class="carousel"{ratio}>\n' + '\n'.join(imgs) + '\n</div>'


def convert_leaf(leaf, page, banner=False):
    cls = leaf.get('class', [])
    if 'tyJCtd' in cls:
        if 'Depvyb' in cls:
            return convert_textbox(leaf, page, banner)
        if 'OWlOyc' in cls:
            return convert_embed(leaf, page)
        if leaf.find(class_='mr3rhf'):
            return convert_carousel(leaf, page)
        if leaf.find(class_='iwQgFb'):
            return '<hr>'
        if leaf.find(class_='J1oeHf'):
            return ''  # empty placeholder in the original
        if leaf.find('img'):
            return convert_image(leaf, page)
        if not leaf.get_text(strip=True):
            return ''
    LOG['leaf-unknown'].append((page, ' '.join(cls)))
    return ''


# ---------------------------------------------------------------- layout
def col_span(col):
    for c in col.get('class', []):
        if c.startswith('hJDwNd-AhqUyc-'):
            return SPAN.get(c.split('-')[-1], 12)
    return 12


def convert_tile(tile, page, banner):
    """A tile (oKdM2c) holds one leaf, or a nested row."""
    parts = []
    for leaf_box in tile.select('.jXK9ad-SmKAyb'):
        if leaf_box.find_parent(class_='oKdM2c') is not tile:
            continue
        for leaf in leaf_box.find_all(recursive=False):
            r = convert_leaf(leaf, page, banner)
            if r:
                parts.append(r)
    for row in tile.find_all(class_='LS81yb'):
        if row.find_parent(class_='oKdM2c') is tile:
            parts.append(convert_row(row, page, banner))
    return '\n'.join(parts)


def convert_stack(stack, page, banner):
    tiles = [t for t in stack.find_all(class_='oKdM2c', recursive=False)]
    collapsible = 'qUO6Ue' in stack.get('class', [])
    htmls = [convert_tile(t, page, banner) for t in tiles]
    if collapsible and htmls:
        head = htmls[0].strip()
        body = '\n'.join(h for h in htmls[1:] if h.strip())
        return f'<details class="drop">\n<summary>{head}</summary>\n<div class="drop-body">\n{body}\n</div>\n</details>'
    return '\n'.join(h for h in htmls if h.strip())


def convert_col(col, page, banner):
    parts = []
    for holder in col.find_all(class_='JNdkSc-SmKAyb', recursive=False):
        for stack in holder.find_all(attrs={'jsname': 'F57UId'}, recursive=False):
            parts.append(convert_stack(stack, page, banner))
    return '\n'.join(p for p in parts if p.strip())


def convert_row(row, page, banner=False):
    cols = [c for c in row.find_all(recursive=False)]
    rendered = [(col_span(c), convert_col(c, page, banner)) for c in cols]
    if len(rendered) == 1:
        return rendered[0][1]
    if not any(h.strip() for _, h in rendered):
        return ''
    out = ['<div class="row">']
    for span, h in rendered:
        if h.strip():
            out.append(f'<div class="col" style="--span:{span}">\n{h}\n</div>')
        else:
            out.append(f'<div class="col" style="--span:{span}"></div>')
    out.append('</div>')
    return '\n'.join(out)


FOOTER_RE = re.compile(r'Click here\s*for information on the author of this site.*Copyright is a minefield', re.S)


def section_classes(sty):
    cls = sty.get('cls', '')
    out = ['sec']
    if 'qeLZfd' in cls:
        out.append('sec-light')
    if 'lQAHbd' in cls:
        out.append('sec-dark')
    if 'WxWicb' in cls:
        out.append('sec-tight')
    return out


def convert_page(fn):
    raw = open(os.path.join(SRC, fn), encoding='utf-8').read()
    soup = BeautifulSoup(raw, 'lxml')
    for t in soup(['script', 'style', 'noscript']):
        t.decompose()
    t = soup.title.get_text(strip=True) if soup.title else ''
    title = t.split(' - ', 1)[1] if ' - ' in t else ('Home' if fn == 'Home.html' else t)
    secs = soup.find_all('section')
    styles = STY.get(fn, [])
    out = []
    for i, sec in enumerate(secs):
        sty = styles[i] if i < len(styles) else {}
        text = sec.get_text(' ', strip=True)
        if FOOTER_RE.search(text) and len(text) < 400:
            continue  # the shared footer now lives in the layout
        rows = [r for r in sec.find_all(class_='LS81yb') if r.find_parent(class_='LS81yb') is None]
        is_banner = i == 0 and 'LB7kq' in sty.get('cls', '')
        inner = '\n'.join(x for x in (convert_row(r, fn, is_banner) for r in rows) if x.strip())
        if is_banner:
            bg = sec.find(class_='IFuOkc')
            m = re.search(r'url\(([^)]+)\)', bg.get('style', '') if bg else '')
            if m:
                rel = register_img(m.group(1).strip('\'"'), fn, 'banner')
                pos = re.search(r'background-position:\s*([^;]+)', bg.get('style', ''))
                shade = sty.get('ovo') or '0'
                vars_ = [f"--banner:url('@@IMG:{rel}@@')", f'--shade:{shade}']
                if pos and pos.group(1).strip() not in ('center center', '50% 50%'):
                    vars_.append(f'--banner-pos:{pos.group(1).strip()}')
                out.append(f'<section class="banner" style="{";".join(vars_)}">\n<div class="wrap">\n{inner}\n</div>\n</section>')
            else:
                out.append(f'<section class="banner banner-plain">\n<div class="wrap">\n{inner}\n</div>\n</section>')
            continue
        if not inner.strip():
            continue
        out.append(f'<section class="{" ".join(section_classes(sty))}">\n<div class="wrap">\n{inner}\n</div>\n</section>')
    return title, '\n\n'.join(out)


# ---------------------------------------------------------------- nav
def build_nav():
    soup = BeautifulSoup(open(os.path.join(SRC, 'Home.html'), encoding='utf-8').read(), 'lxml')
    nav = soup.find('nav')

    def walk(ul):
        items = []
        for li in ul.find_all('li', recursive=False):
            a = li.find('a')
            if not a:
                continue
            item = {'title': a.get_text(' ', strip=True), 'url': map_href(a.get('href', ''), 'nav')}
            kids = []
            for sub in li.find_all('ul'):
                if sub.find_parent('li') is li:
                    kids = walk(sub)
                    break
            if kids:
                item['children'] = kids
            items.append(item)
        return items
    return walk(nav.find('ul'))


# ---------------------------------------------------------------- main
EMBEDS = {}


def main():
    files = sorted(f for f in os.listdir(SRC) if f.endswith('.html'))
    missing = [f for f in files if f not in PAGES]
    assert not missing, f'unmapped pages: {missing}'
    results = {}
    for fn in files:
        results[fn] = convert_page(fn)
    # image destinations (needs all uses known first)
    dests = {}
    for rel in IMG_USES:
        h = os.path.basename(rel)
        name = os.path.splitext(h)[0] + ('.png' if has_alpha(rel) else '.jpg')
        pages = _HASH_PAGES[h]
        if len(pages) > 1:
            dests[rel] = f'/assets/images/shared/{name}'
        else:
            only = next(iter(pages))
            dests[rel] = f'/assets/images/{PAGES[only] or "home"}/{name}'
    for fn, (title, body) in results.items():
        body = re.sub(r'@@IMG:(.+?)@@', lambda m: dests[m.group(1)], body)
        path = PAGES[fn]
        target = os.path.join(OUT, 'index.html' if not path else path + '.html')
        # section landing pages: /macbeth/ -> macbeth/index.html so children sit alongside
        if path and any(p.startswith(path + '/') for p in PAGES.values()):
            target = os.path.join(OUT, path, 'index.html')
        os.makedirs(os.path.dirname(target), exist_ok=True)
        fm = ['---', f'title: {json.dumps(title, ensure_ascii=False)}',
              f'permalink: /{path}.html   # address: /{path}' if path else 'permalink: /']
        if fn in DRAFTS:
            fm.append('draft: true   # only shown when previewing locally (npm start)')
        fm.append(f'# imported from Google Sites: "{fn}"')
        fm.append('---')
        with open(target, 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(fm) + '\n\n' + body.strip() + '\n')
    os.makedirs(os.path.join(OUT, 'assets', 'embeds'), exist_ok=True)
    for fname, code in EMBEDS.items():
        with open(os.path.join(OUT, 'assets', 'embeds', fname), 'w', encoding='utf-8') as fh:
            fh.write(code)
    os.makedirs(os.path.join(OUT, '_data'), exist_ok=True)
    json.dump(build_nav(), open(os.path.join(OUT, '_data', 'nav.json'), 'w'), indent=2, ensure_ascii=False)
    manifest = [{'src': rel, 'dest': dests[rel], 'kind': IMG_KIND.get(rel, 'content')} for rel in sorted(dests)]
    manifest += [{'src': 'f811f67b06a73d248ba0206b305e540c.jpg', 'dest': '/assets/images/site/logo.jpg', 'kind': 'logo'},
                 {'src': 'd5bae3f3a2d7a54be20ba9b8d7c51a85.jpg', 'dest': '/assets/images/site/favicon.jpg', 'kind': 'logo'}]
    json.dump(manifest, open(os.path.join(OUT, '..', 'tools', 'image-manifest.json'), 'w'), indent=1)
    if DO_IMAGES:
        process_images(manifest)
    print(f'pages: {len(results)}  embeds: {len(EMBEDS)}  images: {len(manifest)}')
    for k, v in LOG.items():
        print(f'LOG {k}: {len(v)}', v[:8])


IMG_ROOTS = [SRC] + [r for r in os.environ.get('IMG_ROOTS', '').split(os.pathsep) if r]


def find_img(rel):
    for r in IMG_ROOTS:
        p = os.path.join(r, rel)
        if os.path.exists(p):
            return p
    return None


def has_alpha(rel):
    """True for images (often PNGs saved with a .jpg name) that really use transparency."""
    p = find_img(rel)
    if not p:
        return False
    try:
        from PIL import Image
        im = Image.open(p)
        if im.mode == 'P' and 'transparency' in im.info:
            im = im.convert('RGBA')
        if im.mode in ('RGBA', 'LA'):
            return im.getchannel('A').getextrema()[0] < 255
    except Exception:
        pass
    return False


def process_images(manifest):
    from PIL import Image, ImageOps
    maxw = {'banner': 2000, 'carousel': 1400, 'content': 1400, 'logo': 400}
    for m in manifest:
        src = find_img(m['src'])
        dst = os.path.join(OUT, m['dest'].lstrip('/'))
        if not src:
            LOG['image-missing'].append(m['src'])
            continue
        if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            im = Image.open(src)
            im = ImageOps.exif_transpose(im)
            w = maxw.get(m['kind'], 1400)
            if dst.endswith('.png'):
                im = im.convert('RGBA')
                if im.width > w:
                    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
                im.save(dst, 'PNG', optimize=True)
                continue
            if im.mode in ('RGBA', 'LA', 'P'):
                rgba = im.convert('RGBA')
                im = Image.new('RGB', rgba.size, (255, 255, 255))
                im.paste(rgba, mask=rgba.getchannel('A'))
            elif im.mode not in ('RGB', 'L'):
                im = im.convert('RGB')
            if im.width > w:
                im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            im.save(dst, 'JPEG', quality=80, optimize=True, progressive=True)
        except Exception as e:  # keep going; report at the end
            LOG['image-error'].append((m['src'], str(e)))


if __name__ == '__main__':
    main()
