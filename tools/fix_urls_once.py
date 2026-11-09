"""One-off: switch page addresses from /macbeth/plot/ to /macbeth/plot (as on Google Sites),
and mark pages that nothing links to as sitemap: false. Run from the repo root."""
import json, os, re

SRC = 'src'
NO_SITEMAP = {  # published pages that aren't in the menu and nothing links to
    'a-christmas-carol/acc-curve-balls', 'an-inspector-calls/aic-curveballs', 'an-inspector-calls/in-a-nutshell',
    'unseen-poetry/covid-19-poems', 'unseen-poetry/growing-up', 'unseen-poetry/seasons', 'unseen-poetry/tissue-analysis',
    'lang-paper-2/discussion-and-discourse', 'lang-paper-2/discussion-and-discourse-ii', 'lang-paper-2/random-ideas',
    'lang-paper-2/random-ideas/extremism', 'lang-paper-2/random-ideas/left-right', 'lang-paper-2/random-ideas/the-environment',
    'lang-paper-2/random-ideas/the-free-market', 'teachers-corner/miss', 'teachers-corner/the-whole-lot',
    'how-to-revise/writing-skills', 'macbeth/games',
}

pages = []
for root, _, files in os.walk(SRC):
    if root.startswith(os.path.join(SRC, 'assets')) or root.startswith(os.path.join(SRC, '_')):
        continue
    for f in files:
        if f.endswith('.html'):
            pages.append(os.path.join(root, f))

paths = set()
for p in pages:
    m = re.search(r'^permalink: /(\S*)/$', open(p, encoding='utf-8').read(), re.M)
    if m:
        paths.add(m.group(1))


def fix_links(text):
    def rep(m):
        path, frag = m.group(1), m.group(2) or ''
        return f'href="/{path}{frag}"' if path in paths else m.group(0)
    return re.sub(r'href="/([a-z0-9/-]+)/(#[^"]*)?"', rep, text)


changed = 0
for p in pages:
    s = open(p, encoding='utf-8').read()
    head, sep, body = s.partition('\n---\n')
    m = re.search(r'^permalink: /(\S*)/$', head, re.M)
    if m and m.group(1):
        path = m.group(1)
        head = head.replace(f'permalink: /{path}/', f'permalink: /{path}.html   # address: /{path}')
        if path in NO_SITEMAP and 'sitemap:' not in head:
            head += '\nsitemap: false   # not linked from anywhere, so left out of the sitemap'
    new = head + sep + fix_links(body)
    if new != s:
        open(p, 'w', encoding='utf-8').write(new)
        changed += 1

nav_file = os.path.join(SRC, '_data', 'nav.json')
nav = json.load(open(nav_file, encoding='utf-8'))


def walk(items):
    for it in items:
        if it['url'] != '/' and it['url'].endswith('/'):
            it['url'] = it['url'][:-1]
        walk(it.get('children', []))


walk(nav)
json.dump(nav, open(nav_file, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print(f'pages updated: {changed} of {len(pages)}; addresses known: {len(paths)}')
