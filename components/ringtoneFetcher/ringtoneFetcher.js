/**
 * Fetch ringtone from storage
 */

Components.define(
	function(argFormatter, storage){
		return {
			get: function(){
				var input = argFormatter(arguments, {
						name: "ringtoneFetcher",
						definition: [
							{name: "callback", type: "function"}
						]
					}),
					args = input.arguments;

				var RINGTONE_STORAGE_KEY = "ringtone",
					ringtoneStorage = storage.get(RINGTONE_STORAGE_KEY, true),
					ringtoneURL;

				switch(ringtoneStorage){
					case "none":
						// ringtone not set
						args.callback(null);
						break;

					case "default":
					case null:
						// ringtone set to default
						args.callback("sounds/alarm.mp3");
						break;

					case "database":
						// ringtone stored in database
						var db = openDatabase('DB', '1.0', 'my database', 2 * 1024 * 1024);
							db.transaction(function (tx) {
								tx.executeSql('SELECT * FROM data WHERE key="ringtone"', [], function(tx, r){
									args.callback(r.rows.item(0).data);
								});
							});
						break;

					default:
						args.callback(ringtoneStorage);
						break;

					return true;
				}
			}
		}
	}
);