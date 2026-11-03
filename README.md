# Cool Clock

An extension fully loaded with tons of useful time-related features.

This app was originally created as a simple clock displayed in a badge to test the new extension feature introduced back in Chrome 4. It has been growing since then. Initial release was on Dec 22, 2009. Cool Clock was created by Derek Leung. The current codebase supports Manifest V3 while keeping the original clock layouts, icons, sounds, and translations.

## Features

- Digital or analog toolbar clock, with an optional badge clock and custom colors.
- Two popup layouts, alarms, countdowns, stopwatch, hourly announcements, calendar, statistics, and voice or text commands.
- Weather and a seven-day forecast from Open-Meteo, with manual location search or optional browser location. Temperature can be shown in Celsius or Fahrenheit.
- Calendar event import from a public Google Calendar iCal URL or an exported `.ics` file.
- Settings in `options.html` sync through the browser's own account by default. Turn off **Sync settings** to keep them on this device. Chrome and Firefox accounts do not sync with each other. Alarms, countdowns, calendar entries, stopwatch data, usage history, and automatic weather coordinates stay local.

## Build and install

Run `python3 build_extensions.py` from the repository root. It creates:

- `dist/cool-clock-mv3-chrome.zip` for Chrome 120 or newer. Unzip it and select **Load unpacked** at `chrome://extensions`.
- `dist/cool-clock-mv3-firefox.zip` for Firefox 121 or newer. It includes the Gecko add-on ID needed for signing.

Chrome uses a Manifest V3 service worker and an offscreen document for audio and clipboard operations. Firefox uses a Manifest V3 background event page. Both packages are built from the same sources under `src/`.

To make a GitHub release, update the version in `manifest.json` and add a matching entry to `src/pages/update.html`. Pushing that change to `master` runs the [release workflow](.github/workflows/release.yml), which checks both packages and publishes them under a `vX.Y.Z` tag.

## Source layout

| Directory | Contents | Location in the built extension |
| --- | --- | --- |
| `src/pages/` | Popup, settings, calendar, and other HTML pages | Extension root, except weather details under `mv3/` |
| `src/runtime/` | Background worker, offscreen document, and page bridge | `mv3/` |
| `src/ui/` | Page controllers and styles | `scripts/` |
| `src/shared/` | Shared scripts and styles | Extension root or `mv3/`, matching existing URLs |
| `src/assets/` | Original icons, images, fonts, and sounds | Their original paths |
| `src/vendor/` | Bundled Bootstrap and D3 | `bootstrap/` and `d3/` |
| `src/locales/` | Translations | `_locales/` |

The original extension used a `components/` directory for features such as alarms, badge text, localization, weather, and sound. The Manifest V3 code uses the background worker and page controllers instead. It replaces jQuery 2 and Bootstrap 3 with native JavaScript and Bootstrap 5, uses D3 v7 for statistics, and loads translated messages asynchronously. The release packages preserve the URLs needed by the extension pages.

The original README described the project as an exercise in improving JavaScript skills and maintainability. It identified scattered files and synchronous localization as areas to improve. The Manifest V3 update addresses those areas while retaining voice control and the built-in calendar.

## Permissions

| Permission or host | Purpose |
| --- | --- |
| `alarms` | Schedule alarms, countdowns, and hourly announcements. |
| `notifications` | Show alarm, countdown, and hourly notifications. |
| `storage` | Save local data and optionally sync settings within one browser account. |
| `contextMenus` | Add commands to the toolbar icon and editable-field context menus. |
| `geolocation` | Find the current weather location when the user enables that option. |
| `tts` | Speak announcements in Chrome. |
| `activeTab`, `scripting`, `clipboardWrite` | Insert the current time into an editable field or copy it. |
| `power` | Prevent sleep while a clock task requires it in Chrome. |
| `offscreen` | Play audio and handle clipboard work in Chrome's service worker architecture. |
| Open-Meteo hosts | Fetch weather and search for locations. |
| `calendar.google.com` | Import public Google Calendar iCal feeds. |

## Known limits

- Direct Google sign-in for private calendar import is not included. Export a `.ics` file from Google Calendar instead. The importer uses event start dates and does not expand complex recurrence rules.
- Historical statistics stored by the original WebSQL implementation cannot be migrated on current browsers. New sessions are recorded.
- Browser location needs permission and a working location provider. Coordinates are sent to Open-Meteo for weather; if a location refresh fails, the last saved coordinates are used.
- Firefox uses basic notifications and does not support Chrome's `power` API. Voice recognition depends on each browser's Speech Recognition API; text commands remain available.
- Open-Meteo reachability from mainland China has not been verified from a mainland network.

## Resources

Original icons used in the extension:

- [famfamfam Silk Icons](http://www.famfamfam.com/lab/icons/silk/) — Creative Commons Attribution 2.5 License.
- [Material Icons](https://material.io/icons/) — Apache License 2.0.

Original fonts include Roboto, Noto Sans, Oswald, and Meteocons; the original build also used Glyphicons from Bootstrap 3. The default ringtone is from Sound Jay and is bundled as Ogg Opus audio. The current build bundles Bootstrap 5, Bootstrap Icons, and D3; their license files are included under `src/vendor/`. Font and icon license files supplied with the project remain under `src/assets/`.

The original repository does not include a project-level license file. This update does not add one.

## Contributing

Feel free to contribute to the project by creating a pull request.
