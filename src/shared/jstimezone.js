Date.prototype.getTimeZone = function () {
  //var gmtHours = this.getHours()-this.getUTCHours();
  var gmtHours = -this.getTimezoneOffset() / 60;
  return gmtHours;
};

Date.prototype.applyTZ = function () {
  if (globalThis.coolClockSettings?.timezoneEnabled) {
    var TZ = Number(globalThis.coolClockSettings.timezone),
      Time = this.getTime(),
      offsetHour = (-1 * this.getTimeZone() + TZ) * 1000 * 60 * 60,
      newTime = Time + offsetHour;

    this.setTime(newTime);
  }
  return this;
};

Date.prototype.toCurrentTZ = function () {
  if (globalThis.coolClockSettings?.timezoneEnabled) {
    var TZ = Number(globalThis.coolClockSettings.timezone),
      Time = this.getTime(),
      offsetHour = (-1 * this.getTimeZone() + TZ) * 1000 * 60 * 60,
      newTime = Time - offsetHour;

    this.setTime(newTime);
  }
  return this;
};

function getCurrenttimezone(d) {
  if (!d) {
    var d = new Date();
  }
  var gmtHours = -d.getTimezoneOffset() / 60;
  //var gmtHours = d.getHours()-d.getUTCHours();

  return gmtHours;
}

//Old'

function getTimezone() {
  var d = new Date();
  var gmtHours = getCurrenttimezone(d);

  if (globalThis.coolClockSettings?.timezoneEnabled) {
    var newhour = d.getUTCHours() + Number(globalThis.coolClockSettings.timezone);
    if (newhour >= 24) {
      newhour = newhour - 24;
    }
  } else {
    var newhour = d.getHours();
  }

  return newhour;
}

function getTimezoneDate() {
  var d = new Date();
  //var gmtHours = -d.getTimezoneOffset()/60;
  var gmtHours = getCurrenttimezone(d);

  var date = d.getDate();
  if (globalThis.coolClockSettings?.timezoneEnabled) {
    var newhour = d.getUTCHours() + Number(globalThis.coolClockSettings.timezone);
    if (newhour >= 24) {
      date = date + 1;
    }
  }
  return date;
}

function getTimezoneDay() {
  var d = new Date();
  var gmtHours = getCurrenttimezone(d);

  var day = d.getDay();
  if (globalThis.coolClockSettings?.timezoneEnabled) {
    var newhour = d.getUTCHours() + Number(globalThis.coolClockSettings.timezone);
    if (newhour >= 24) {
      day = day + 1;
    }
    if (day > 6) {
      day = day - 7;
    }
  }
  return day;
}
