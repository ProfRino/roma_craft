"""Bundle ROMACRAFT into one double-clickable HTML file (works on file://).

Inlines three.module.js and all game modules into a single inline module
script with imports/exports stripped, so no HTTP server is required.
Usage: python build_standalone.py  ->  ROMACRAFT-standalone.html
"""
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'ROMACRAFT-standalone.html')

GAME_MODULES = [  # dependency order
    'js/textures.js', 'js/world.js', 'js/city.js',
    'js/npc.js', 'js/audio.js', 'js/player.js', 'js/main.js',
]


def read(rel):
    with open(os.path.join(HERE, rel), encoding='utf-8') as f:
        return f.read()


def strip_module_syntax(src):
    src = re.sub(r'^import .*$', '', src, flags=re.M)   # drop import lines
    src = re.sub(r'^export (?=(const|let|var|function|class)\b)', '', src, flags=re.M)
    return src


def build_three():
    src = read('js/lib/three.module.js')
    # wrap in an IIFE so three's internal identifiers can't collide with game
    # code; the final `export { A, B, ... };` becomes `return { A, B, ... };`
    idx = src.rfind('\nexport {')
    if idx == -1:
        raise SystemExit('three.module.js: export block not found')
    body = src[:idx] + '\nreturn {' + src[idx + len('\nexport {'):]
    return 'const THREE = (() => {\n' + body + '\n})();'


def main():
    html = read('index.html')

    parts = ['// ===== three.js r160 (inlined) =====', build_three()]
    for mod in GAME_MODULES:
        parts.append(f'// ===== {mod} =====')
        parts.append(strip_module_syntax(read(mod)))
    bundle = '\n'.join(parts)

    html = re.sub(r'<script type="importmap">.*?</script>\s*', '', html, flags=re.S)
    html = html.replace(
        '<script type="module" src="js/main.js"></script>',
        '<script type="module">\n' + bundle + '\n</script>',
    )

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'wrote {OUT} ({os.path.getsize(OUT) // 1024} KB)')


if __name__ == '__main__':
    main()
