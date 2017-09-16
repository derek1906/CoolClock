# Cool Clock
An extension fully loaded with tons of useful time-related features.

This app was originally created as a simple clock displayed in a badge to test the new extension feature introduced back in Chrome 4.
It has been growing since then. Initial release was on Dec 22, 2009.


## Components
Components are what made up of most of the extension. Here's the list of components:

| Component                    	| Description                                                	|
| ---                          	| ---                                                        	|
| AlarmClock                   	| Alarm clock                                                	|
| alarms                       	| Handles system alarms                                      	|
| app                          	| The extension                                              	|
| BadgeTextManager             	| Manages badge text display                                 	|
| BrowserActionHandler         	| Browser action handler                                     	|
| CountdownTimer               	| Countdown timer                                            	|
| Graphics                     	| Graphics                                                   	|
| HourlyTimeAnnouncementHandler	| Handles hourly time announcements                          	|
| KeepAwake                    	| Manages wake lock for alarm clock and countdown timer, etc.	|
| Localization                 	| Localization                                               	|
| OmniboxHandler               	| Handles omnibox inputs                                     	|
| SectionUptimeManager         	| Section uptime manager (statistics)                        	|
| SoundManager                 	| Sound manager                                              	|
| Stopwatch                    	| Stopwatch                                                  	|
| TimeTZ                       	| Custom time object with customizable timezones             	|
| WeatherHandler               	| Fetches weather information                                	|
| WindowManager                	| Create windows and remember their positions                	|

They are located under `components/`.


## Dependencies
The extension depends on the following libraries:

- jQuery 2.2.4
- Bootstrap 3
- D3


## Todos and Issues
The extension originally was created for the purpose of sharpening my JavaScript skill and develop maintainable practices.
Due to that reason, one of the major issues of the extension is that it contains a large amount of legacy code.

### Issue 1 - Unorganized Files
Many old files are unorganized and all over the root directory. The end goal is to organize them into their corresponding
component directory.

This is ongoing.

### Issue 2 - Rewriting Codes Written More Than Half A Decade Ago
Old files contain many code smells and codes that are hard to maintain. The solution is to completely rewrite
them as components. A major part of the extension has been rewritten into components. These still need to be created:

- NotificationManager

There are also files that should not be used but old codes depend on, such as `tools.js`. They should be removed once the files
that depend on them are rewritten.

This is ongoing.

### Issue 3 - Localization
Localization is a particularly difficult problem to solve. Before the adoption of the component structure, localization was
achieved via the `i18n` function in `translation.js`. It let users to specify the language that they want to use (Chrome does
not native support this), and dynamically fetch the language files *synchronously* such that it can be used as such:

    var settings_str = i18n("settings");

AJAX calls should not be synchronous, however it did simply a lot of the code. It would be ideal if the extension can be rewritten
in a way such that localized strings can be fetched synchronously. One possible solution would be to load all the strings into
memory during extension initialization.

This is being considered.

### Issue 4 - Unnecessary Features
There are some unnecessary features that I'm considering to remove in the future:

- Voice control

### Issue 5 - Calendar
One of the feature that this extension has is a built-in calendar. The original idea is to support syncing events between
Google Calendar and the extension. However I don't see how this can be useful in anyway and I'm considering removing it in
the future.


## Resources
Icons used in the extension:

- [famfamfam Silk Icons](http://www.famfamfam.com/lab/icons/silk/)  
    Licensed under a Creative Commons Attribution 2.5 License.
- [Material Icons](https://material.io/icons/)  
    Licensed under Apache License Version 2.0.

Fonts used in the extension:

- Glyphicons from Bootstrap 3
- Roboto
- NotoSans
- Oswald
- Meteocons

Default ringtone:

- Sound Jay

## Contributing
Feel free to contribute to the project by creating a pull request.

### Adding/Updating Language Files
This is not one of my main concerns currently and should be not be done in this repository.