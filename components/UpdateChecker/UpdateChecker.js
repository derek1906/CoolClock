/**
 * Checks for updates when during initialization
 */

Components.define(
	function(log, storage, BadgeTextManager, Localization, BrowserActionHandler){
		var currentVersion = chrome.runtime.getManifest().version,
			storedVersion = storage.get("version", true),
			displayUpdateNotice = storage.get("showupdate"),

			// updated if the previously stored version is not the same as the current version
			isUpdated = storedVersion !== currentVersion,
			hasUpdateMsg = false; // no update message for this version

		log("UpdateChecker", "Update status:", isUpdated);

		if(displayUpdateNotice && isUpdated && hasUpdateMsg){
			// display update notice
			
			var language = Localization.getSelectedLanguage(),
				buttons = [{
					title: i18n("whatsnew"),
					iconUrl: "/images/icons/page_white_get.png",
					onclick: function(){
						app.displayChangelog();
					}
				}];

			if(language !== "zh-TW" && language !== "zh-CN"){
				createNoti({
					type: "list",
					title: i18n("extName")+" has just updated to "+ currentVersion +"", 
					message: i18n("extName")+" has just updated.",
					items: [{title: "", message: "(Hover above each item to read more)"},
							{title: "[Fix] ", message: "Minor bug fixes"}
						]
				}, {
					buttons: buttons
				});
			}else{
				createNoti({
					type: "list",
					title: i18n("extName")+"剛剛更新了! (最新版本 "+ currentVersion +")", 
					message: i18n("extName")+"剛剛更新了!",
					items: [{title: "", message: "（把鼠標放到更新項目上以閱讀全句）"},
							{title: "[Fix] ", message: "錯誤修正"}
						]
				}, {
					buttons: buttons
				});
			}
		
			// display "new" on badge
			BadgeTextManager.set("update-notice", "new", "#428bca").setHighPriority(true);
			setTimeout(function(){
				BadgeTextManager.remove("update-notice");
			}, 5000);
		}
		
		if(isUpdated)	storage.set("version", currentVersion, true);

		var app = {
			displayChangelog: function(){
				chrome.tabs.create({ url: "/update.html" });
			}
		};

		return app;
	}
);