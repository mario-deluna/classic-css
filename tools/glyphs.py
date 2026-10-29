#!/usr/bin/env python3
"""
Generates less/glyphs.less from the ASCII pixel art below.

Every glyph becomes a mixin `.glyph-<name>(@c1, @c2, ...)` that sets a
crisp pixel SVG as background image (see .pixel-icon in mixins.less).
Each character in the art maps to a color parameter, '.' is transparent.

Run: python3 tools/glyphs.py
"""
import os

GLYPHS = {
    # name: (art, {char: (param, default)})
    'check': ('''
......#
.....##
#...###
##.###.
#####..
.###...
..#....
''', {'#': ('c', '#000')}),

    'radio': ('''
....gggg....
..ggddddgg..
.gddwwwwddl.
.gdwwwwwwfl.
gdwwwwwwwwfl
gdwwwwwwwwfl
gdwwwwwwwwfl
gdwwwwwwwwfl
.gdwwwwwwfl.
.gffwwwwffl.
..llffffll..
....llll....
''', {'g': ('outer-tl', '#808080'), 'l': ('outer-br', '#fff'),
      'd': ('inner-tl', '#404040'), 'f': ('inner-br', '#d4d0c8'),
      'w': ('field', '#fff')}),

    'radio-checked': ('''
....gggg....
..ggddddgg..
.gddwwwwddl.
.gdwwwwwwfl.
gdwwwxxwwwfl
gdwwxxxxwwfl
gdwwxxxxwwfl
gdwwwxxwwwfl
.gdwwwwwwfl.
.gffwwwwffl.
..llffffll..
....llll....
''', {'g': ('outer-tl', '#808080'), 'l': ('outer-br', '#fff'),
      'd': ('inner-tl', '#404040'), 'f': ('inner-br', '#d4d0c8'),
      'w': ('field', '#fff'), 'x': ('c', '#000')}),

    'radio-dot': ('''
.##.
####
####
.##.
''', {'#': ('c', '#000')}),

    'arrow-down': ('''
#######
.#####.
..###..
...#...
''', {'#': ('c', '#000')}),

    'arrow-up': ('''
...#...
..###..
.#####.
#######
''', {'#': ('c', '#000')}),

    'arrow-left': ('''
...#
..##
.###
####
.###
..##
...#
''', {'#': ('c', '#000')}),

    'arrow-right': ('''
#...
##..
###.
####
###.
##..
#...
''', {'#': ('c', '#000')}),

    'arrow-down-small': ('''
#####
.###.
..#..
''', {'#': ('c', '#000')}),

    'arrow-up-small': ('''
..#..
.###.
#####
''', {'#': ('c', '#000')}),

    'title-minimize': ('''
........
........
........
........
........
........
######..
######..
''', {'#': ('c', '#000')}),

    'title-maximize': ('''
#########
#########
#.......#
#.......#
#.......#
#.......#
#.......#
#.......#
#########
''', {'#': ('c', '#000')}),

    'title-restore': ('''
..######
..######
..#....#
######.#
######.#
#....###
#....#..
#....#..
######..
''', {'#': ('c', '#000')}),

    'title-close': ('''
##....##
.##..##.
..####..
...##...
..####..
.##..##.
##....##
''', {'#': ('c', '#000')}),

    'title-help': ('''
..####..
.##..##.
.....##.
....##..
...##...
...##...
........
...##...
''', {'#': ('c', '#000')}),

    'tree-plus': ('''
ggggggggg
gwwwwwwwg
gwwwbwwwg
gwwwbwwwg
gwbbbbbwg
gwwwbwwwg
gwwwbwwwg
gwwwwwwwg
ggggggggg
''', {'g': ('border', '#808080'), 'w': ('field', '#fff'), 'b': ('c', '#000')}),

    'tree-minus': ('''
ggggggggg
gwwwwwwwg
gwwwwwwwg
gwwwwwwwg
gwbbbbbwg
gwwwwwwwg
gwwwwwwwg
gwwwwwwwg
ggggggggg
''', {'g': ('border', '#808080'), 'w': ('field', '#fff'), 'b': ('c', '#000')}),

    'resize-grip': ('''
..........w.
.........wg.
........wgg.
.......wgg..
......wgg.w.
.....wgg.wg.
....wgg.wgg.
...wgg.wgg..
..wgg.wgg.w.
.wgg.wgg.wg.
wgg.wgg.wgg.
............
''', {'w': ('light', '#fff'), 'g': ('dark', '#808080')}),

    'gripper': ('''
w.
wg
.g
''', {'w': ('light', '#fff'), 'g': ('dark', '#808080')}),
}


def arrow_button(w, h, arrow):
    """A raised button face (w x h) with an arrow glyph centered on it."""
    rows = []
    for y in range(h):
        if y == h - 1:
            rows.append('k' * w)
        elif y == h - 2:
            rows.append('o' + 's' * (w - 2) + 'k')
        elif y == 0:
            rows.append('o' * (w - 1) + 'k')
        elif y == 1:
            rows.append('o' + 'i' * (w - 3) + 's' + 'k')
        else:
            rows.append('oi' + 'f' * (w - 4) + 'sk')
    art = GLYPHS[arrow][0].strip('\n').split('\n')
    aw, ah = len(art[0]), len(art)
    ox, oy = (w - aw) // 2, (h - ah) // 2
    for ay, arow in enumerate(art):
        row = list(rows[oy + ay])
        for ax, ch in enumerate(arow):
            if ch != '.':
                row[ox + ax] = 'a'
        rows[oy + ay] = ''.join(row)
    return '\n'.join(rows)


BUTTON_COLORS = {'o': ('outer-tl', '#d4d0c8'), 'i': ('inner-tl', '#fff'),
                 's': ('inner-br', '#808080'), 'k': ('outer-br', '#404040'),
                 'f': ('face', '#d4d0c8'), 'a': ('c', '#000')}

GLYPHS['combo-button'] = (arrow_button(16, 17, 'arrow-down'), BUTTON_COLORS)
for d in ('up', 'down', 'left', 'right'):
    GLYPHS['scroll-' + d] = (arrow_button(16, 16, 'arrow-' + d), BUTTON_COLORS)


def runs(art, char):
    """Returns an SVG path of horizontal runs for every pixel matching char."""
    d = []
    for y, row in enumerate(art):
        x = 0
        while x < len(row):
            if row[x] == char:
                start = x
                while x < len(row) and row[x] == char:
                    x += 1
                d.append('M%d %dh%dv1h-%dz' % (start, y, x - start, x - start))
            else:
                x += 1
    return ''.join(d)


def glyph(name, art, colors):
    rows = [r for r in art.strip('\n').split('\n')]
    w = max(len(r) for r in rows)
    h = len(rows)
    params = '; '.join('@%s: "%s"' % (p, c.replace('#', '%23')) for (p, c) in colors.values())
    body = ''.join("<path fill='@{%s}' d='%s'/>" % (p, runs(rows, ch)) for ch, (p, _) in colors.items())
    return '.glyph-%s(%s) {\n\t.pixel-icon(%d, %d, "%s");\n}\n' % (name, params, w, h, body)


out = ['// Generated by tools/glyphs.py, do not edit by hand.\n']
for name, (art, colors) in GLYPHS.items():
    out.append(glyph(name, art, colors))

path = os.path.join(os.path.dirname(__file__), '..', 'less', 'glyphs.less')
with open(path, 'w') as f:
    f.write('\n'.join(out))
print('wrote', os.path.normpath(path))
