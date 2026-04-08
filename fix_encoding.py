import codecs

file_path = r'c:\Users\Gabriel\Documents\GitHub\Cursaas\frontend\src\app\features\aluno\pages\aula-details.component.ts'

with codecs.open(file_path, 'r', 'utf-8-sig') as f:
    content = f.read()

fixes = [
    ('\u00e2\u2020\x90', '\u2190'),
    ('\u00f0\u0178\u201c\u0161', '\U0001f4da'),
    ('\u00e2\x8f\u00b1', '\u23f1'),
    ('\u00c3\u00ba', '\u00fa'),
    ('\u00f0\u0178\u201d\u2018', '\U0001f512'),
    ('\u00c3\u00ad', '\u00ed'),
    ('\u00c3\u00a3', '\u00e3'),
    ('\u00c3\u00a7', '\u00e7'),
    ('\u00e2\u201d\u20ac', '\u2500'),
    ('\u00f0\u0178\u201d\u201e', '\U0001f504'),
    ('\u00c3\u00aa', '\u00ea'),
    ('\u00c3\u00a9', '\u00e9'),
]

for garbled, correct in fixes:
    count = content.count(garbled)
    print(f'Replacing {repr(garbled)} -> {repr(correct)} ({count}x)')
    content = content.replace(garbled, correct)

with codecs.open(file_path, 'w', 'utf-8-sig') as f:
    f.write(content)

print('Done!')
