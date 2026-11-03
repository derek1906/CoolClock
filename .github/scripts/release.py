"""Validate a browser release and turn its update.html entry into release notes."""
import argparse
import html
import json
import re
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[2]
VERSION = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))['version']
LOCALE_FILES = sorted((ROOT / 'src' / 'locales').glob('*/messages.json'))


def changelog_items():
    page = (ROOT / 'src' / 'pages' / 'update.html').read_text(encoding='utf-8-sig')
    section = re.search(
        r'<h3\b[^>]*>\s*Ver\.\s*' + re.escape(VERSION) + r'\s*</h3>\s*<ul>(.*?)</ul>',
        page, re.IGNORECASE | re.DOTALL,
    )
    if not section:
        raise SystemExit(f'update.html has no Ver. {VERSION} entry')
    items = []
    for raw in re.findall(r'<li\b[^>]*>(.*?)</li>', section.group(1), re.IGNORECASE | re.DOTALL):
        item = html.unescape(re.sub(r'<[^>]*>', ' ', raw))
        item = ' '.join(item.split())
        if item:
            items.append(item)
    if not items:
        raise SystemExit(f'update.html has no notes for {VERSION}')
    return items


def check_archives():
    locale_names = {f'_locales/{path.parent.name}/messages.json' for path in LOCALE_FILES}
    if not locale_names or '_locales/en/messages.json' not in locale_names:
        raise SystemExit('No default translation catalog')
    for browser in ('chrome', 'firefox'):
        path = ROOT / 'dist' / f'cool-clock-mv3-{browser}.zip'
        with ZipFile(path) as archive:
            damaged = archive.testzip()
            if damaged:
                raise SystemExit(f'{path.name}: corrupt entry {damaged}')
            names = set(archive.namelist())
            manifest = json.loads(archive.read('manifest.json'))
            if manifest['manifest_version'] != 3 or manifest['version'] != VERSION:
                raise SystemExit(f'{path.name}: manifest version mismatch')
            if manifest['action']['default_popup'] not in names:
                raise SystemExit(f'{path.name}: missing popup')
            background = manifest['background']
            scripts = [background['service_worker']] if browser == 'chrome' else background['scripts']
            if any(script not in names for script in scripts):
                raise SystemExit(f'{path.name}: missing background script')
            if not locale_names <= names:
                raise SystemExit(f'{path.name}: missing translations: {sorted(locale_names - names)}')
            english = json.loads(archive.read('_locales/en/messages.json'))
            keys = set(english)
            for locale_name in sorted(locale_names):
                messages = json.loads(archive.read(locale_name))
                if set(messages) != keys:
                    raise SystemExit(f'{path.name}: {locale_name} has missing or extra keys')
                blanks = [key for key, entry in messages.items()
                          if not isinstance(entry.get('message'), str) or not entry['message'].strip()]
                if blanks:
                    raise SystemExit(f'{path.name}: {locale_name} has blank messages: {blanks}')
                for key, entry in messages.items():
                    expected = set(re.findall(r'\{[a-zA-Z]+\}', english[key]['message']))
                    actual = set(re.findall(r'\{[a-zA-Z]+\}', entry['message']))
                    if actual != expected:
                        raise SystemExit(f'{path.name}: {locale_name}/{key} has different placeholders')
        print(f'Checked {path.name}')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=('version', 'notes', 'check'))
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9]+(?:\.[0-9]+){2,3}', VERSION):
        raise SystemExit(f'Invalid extension version: {VERSION}')
    if args.command == 'version':
        print(VERSION)
    elif args.command == 'notes':
        print(f'# Cool Clock v{VERSION}\n')
        for item in changelog_items():
            print(f'- {item}')
    else:
        changelog_items()
        check_archives()


if __name__ == '__main__':
    main()
