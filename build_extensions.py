"""Build Chrome and Firefox MV3 packages from the shared native JavaScript source."""
import copy
import json
import re
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parent
src = root / 'src'
manifest = json.loads((root / 'manifest.json').read_text())
runtime = src / 'runtime'
runtime_files = sorted(path for path in runtime.rglob('*') if path.is_file())
original_assets = ('icons/16x16.png', 'icons/128x128.png', 'n_icon.png', 'sounds/alarm.ogg')
# Files kept at their established extension paths for page resource URLs.
page_resources = (
    'scripts/popup/css.css', 'scripts/popup/js.js',
    'scripts/popup_classic/js.js',
    'scripts/calendar/js.js', 'scripts/speech/js.js',
    'scripts/weather_details/js.js',
    'scripts/alarm_interface/css.css', 'scripts/countdown_interface/css.css',
    'scripts/timer/css.css', 'scripts/timer/js.js', 'scripts/stopwatch_split/js.js',
    'scripts/calendar_full/css.css', 'scripts/calendar_full/dialog_native.css',
    'scripts/options/css.css',
    'scripts/statistics/css.css', 'scripts/statistics/js.js',
    'd3/d3.v7.min.js', 'd3/D3-LICENSE',
    'scripts/about/css.css', 'scripts/about/js.js',
    'scripts/update/css.css', 'scripts/update/js.js',
    'bootstrap/bootstrap.min.css', 'bootstrap/bootstrap.bundle.min.js',
    'bootstrap/icons.css', 'bootstrap/fonts/bootstrap-icons.woff',
    'bootstrap/icons-LICENSE', 'bootstrap/migration.css', 'bootstrap/native.js',
    'bootstrap/LICENSE',
    'input.css',
    'jstimezone.js',
    'fonts/Roboto-Thin.ttf', 'fonts/Roboto-Regular.ttf', 'fonts/Roboto-Medium.ttf', 'fonts/NotoSans-Regular.ttf',
    'fonts/Oswald.woff',
    'fonts/LICENSE (Roboto).txt',
    'images/icons/timeline_24dp.png', 'images/icons/settings_24dp.png',
    'images/icons/help_24dp.png', 'images/icons/forum_24dp.png',
    'images/icons/info_24dp.png', 'images/icons/License',
    'scripts/popup_classic/css.css', 'scripts/flipclock/js.js',
    'scripts/speech/css.css',
    'check.png', 'radio2.png', 'fonts/mic.woff',
    'images/to_left.png', 'images/to_left_down.png', 'images/to_right.png', 'images/to_right_down.png',
    'images/icons/clock.png', 'images/icons/clock_play.png', 'images/icons/clock_pause.png',
    'images/icons/gear.png', 'images/icons/bell.png', 'images/comment.png',
    'images/icons/clock_red.png', 'images/icons/chart_bar.png', 'icons/empty.png',
    'images/facebook_icon.gif', 'images/icons/clock_edit.png', 'images/icons/arrow_in.png',
    'images/icons/control_rewind_blue.png', 'images/icons/control_rewind.png',
    'images/icons/control_fastforward_blue.png', 'images/icons/control_fastforward.png',
)
output_dir = root / 'dist'
output_dir.mkdir(exist_ok=True)


def source_file(package_path):
    """Find a source file without changing its established extension URL."""
    path = Path(package_path)
    groups = {
        'mv3': src / 'runtime',
        'scripts': src / 'ui',
        'bootstrap': src / 'vendor' / 'bootstrap',
        'd3': src / 'vendor' / 'd3',
        'fonts': src / 'assets' / 'fonts',
        'icons': src / 'assets' / 'icons',
        'images': src / 'assets' / 'images',
        'sounds': src / 'assets' / 'sounds',
    }
    if len(path.parts) > 1:
        return groups[path.parts[0]].joinpath(*path.parts[1:])
    if path.suffix == '.html':
        return src / 'pages' / path
    if path.name in ('translation.js', 'jstimezone.js', 'input.css'):
        return src / 'shared' / path
    if path.name == 'n_icon.png':
        return src / 'assets' / 'icons' / path
    if path.name in ('check.png', 'radio.png', 'radio2.png'):
        return src / 'assets' / 'images' / path
    raise ValueError(f'Unmapped package path: {package_path}')


def locale_files():
    for path in sorted((src / 'locales').glob('*/messages.json')):
        language = path.parent.name
        contents = path.read_text(encoding='utf-8-sig')
        json.loads(contents)
        yield f'_locales/{language}/messages.json', contents


firefox = copy.deepcopy(manifest)
firefox['background'] = {'scripts': ['mv3/locale_catalog.js', 'mv3/i18n.js', 'mv3/offscreen.js', 'mv3/worker.js']}
firefox['permissions'].remove('offscreen')
firefox['permissions'].remove('tts')
firefox['permissions'].remove('power')
firefox.pop('minimum_chrome_version', None)
firefox['browser_specific_settings'] = {'gecko': {
    'id': '{76647e60-fd31-46cf-9b37-28fd1fd4804b}',
    'strict_min_version': '140.0',
    'data_collection_permissions': {'required': ['none'], 'optional': ['locationInfo']},
}}

for browser, configured in [('chrome', manifest), ('firefox', firefox)]:
    output = output_dir / f'cool-clock-mv3-{browser}.zip'
    with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
        archive.writestr('manifest.json', json.dumps(configured, ensure_ascii=False, indent=2) + '\n')
        for path in runtime_files:
            if browser == 'firefox' and path.name == 'offscreen.html':
                continue
            package_path = Path('mv3') / path.relative_to(runtime)
            if path.suffix == '.html' and path.name != 'offscreen.html':
                archive.writestr(str(package_path), path.read_text(encoding='utf-8-sig'))
            else:
                archive.write(path, package_path)
        archive.write(src / 'shared' / 'device_location.js', 'mv3/device_location.js')
        archive.write(src / 'shared' / 'i18n.js', 'mv3/i18n.js')
        archive.writestr('mv3/weather_details.html', (src / 'pages' / 'weather_details.html').read_text(encoding='utf-8-sig'))
        for package_path in original_assets:
            archive.write(source_file(package_path), package_path)
        catalog = {}
        for locale_path, contents in locale_files():
            language = locale_path.split('/')[1]
            catalog[language] = {key: value['message'] for key, value in json.loads(contents).items()}
        archive.writestr('mv3/locale_catalog.js', 'globalThis.COOL_CLOCK_LOCALES = ' + json.dumps(catalog, ensure_ascii=False) + ';\n')
        for package_path in page_resources:
            path = source_file(package_path)
            if package_path == 'scripts/timer/css.css':
                archive.writestr(package_path, path.read_text(encoding='utf-8-sig').replace('Roboto-Regular.tff', 'Roboto-Regular.ttf'))
            else:
                archive.write(path, package_path)
        popup_html = source_file('popup.html').read_text(encoding='utf-8-sig')
        popup_html = re.sub(r'<script\b[^>]*>\s*</script>', '', popup_html)
        popup_html = popup_html.replace('<head>', '<head><meta charset="utf-8">', 1)
        popup_html = popup_html.replace('</head>', '<script src="/mv3/locale_catalog.js" defer></script><script src="/mv3/i18n.js" defer></script><script src="/mv3/device_location.js" defer></script><script src="/scripts/popup/js.js" defer></script></head>', 1)
        archive.writestr('popup.html', popup_html)
        old_popup_html = source_file('popup_classic.html').read_text(encoding='utf-8-sig')
        old_popup_html = re.sub(r'<script\b[^>]*>\s*</script>', '', old_popup_html)
        old_popup_html = old_popup_html.replace('</head>', '<script src="/mv3/locale_catalog.js" defer></script><script src="/mv3/i18n.js" defer></script><script src="/scripts/popup_classic/js.js" defer></script></head>', 1)
        archive.writestr('popup_classic.html', old_popup_html)
        speech_html = source_file('speech.html').read_text(encoding='utf-8-sig')
        speech_html = re.sub(r'<script\b[^>]*>\s*</script>', '', speech_html)
        speech_html = speech_html.replace('</head>', '<script src="/mv3/locale_catalog.js" defer></script><script src="/mv3/i18n.js" defer></script><script src="/scripts/speech/js.js" defer></script></head>', 1)
        archive.writestr('speech.html', speech_html)
        archive.writestr('flipclock.html', source_file('flipclock.html').read_text(encoding='utf-8-sig'))
        small_calendar_html = source_file('calendar.html').read_text(encoding='utf-8-sig')
        small_calendar_html = re.sub(r'<script\b[^>]*>\s*</script>', '', small_calendar_html, flags=re.I)
        small_calendar_html = small_calendar_html.replace('</head>', '<script src="/scripts/calendar/js.js" defer></script></head>', 1)
        archive.writestr('calendar.html', small_calendar_html)
        for page in ('timer.html', 'stopwatch_split.html'):
            archive.writestr(page, source_file(page).read_text(encoding='utf-8-sig'))
        translation = source_file('translation.js').read_text(encoding='utf-8-sig')
        translation = translation.replace('if(window.Components && Components.getSingleton("Localization")){', 'if(window.Components && typeof Components.getSingleton === "function" && Components.getSingleton("Localization")){')
        archive.writestr('translation.js', translation)
        for page, controller in [('alarm_interface.html', 'alarm_interface'), ('countdown_interface.html', 'countdown_interface')]:
            html = source_file(page).read_text(encoding='utf-8-sig')
            html = re.sub(r'<script\b[^>]*src="/scripts/' + controller + r'/js\.js"[^>]*>\s*</script>', '', html)
            html = html.replace('</head>', '<script src="/mv3/legacy_bridge.js" defer></script></head>', 1)
            archive.writestr(page, html)
            code = source_file(f'scripts/{controller}/js.js').read_text(encoding='utf-8-sig')
            archive.writestr('mv3/original_' + ('alarm' if controller == 'alarm_interface' else 'countdown') + '.js', code)
        calendar_html = source_file('calendar_full.html').read_text(encoding='utf-8-sig')
        calendar_html = re.sub(r'<script\b[^>]*src="/scripts/calendar_full/js\.js"[^>]*>\s*</script>', '', calendar_html)
        calendar_html = calendar_html.replace('</head>', '<script src="/mv3/legacy_bridge.js" defer></script></head>', 1)
        archive.writestr('calendar_full.html', calendar_html)
        archive.writestr('mv3/original_calendar.js', source_file('scripts/calendar_full/js.js').read_text(encoding='utf-8-sig'))
        options_html = source_file('options.html').read_text(encoding='utf-8-sig')
        options_html = re.sub(r'<script\b[^>]*src="/scripts/options/js\.js"[^>]*>\s*</script>', '', options_html)
        options_html = options_html.replace('Weather information provided by Yahoo! Weather', 'Weather information provided by Open-Meteo')
        options_html = options_html.replace('This shows the WOEID of the current location.', 'This shows the location ID.')
        options_html = options_html.replace('</head>', '<script src="/mv3/legacy_bridge.js" defer></script></head>', 1)
        archive.writestr('options.html', options_html)
        archive.writestr('mv3/original_options.js', source_file('scripts/options/js.js').read_text(encoding='utf-8-sig'))
        stats_html = source_file('statistics.html').read_text(encoding='utf-8-sig')
        stats_html = re.sub(r'<script\b[^>]*>\s*</script>', '', stats_html)
        stats_html = stats_html.replace('</head>', '<script src="/d3/d3.v7.min.js" defer></script><script src="/mv3/locale_catalog.js" defer></script><script src="/mv3/i18n.js" defer></script><script src="/scripts/statistics/js.js" defer></script></head>', 1)
        archive.writestr('statistics.html', stats_html)
        for page, replacement in (
            ('about.html', 'about'),
            ('update.html', 'update'),
        ):
            html = source_file(page).read_text(encoding='utf-8-sig')
            html = re.sub(r'<script\b[^>]*>\s*</script>', '', html)
            html = html.replace('</head>', f'<script src="/mv3/locale_catalog.js" defer></script><script src="/mv3/i18n.js" defer></script><script src="/scripts/{replacement}/js.js" defer></script></head>', 1)
            archive.writestr(page, html)
        for path, contents in locale_files():
            archive.writestr(path, contents)
    print(output)
