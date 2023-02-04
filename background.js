var config = {};

/**
 * Initialize configuration
 * Then fetch latest data
 */
init().then(checkActiveTime).then(fetchDepartureTimes).catch(error => {
  console.error(error)
});

/**
 * Initialize config object with default values
 * stored in chrome.storage.sync
 */
async function init() {
  const { line, delayInMinutes, activeTime, selectedDays, countDown } = await chrome.storage.sync.get({
    line: "GVB_906_1",
    delayInMinutes: 10,
    activeTime: "17:00",
    selectedDays: [],
    countDown: false
    });
    config = { line, delayInMinutes, activeTime, selectedDays, countDown };
    if (config.countDown) {
    chrome.action.setBadgeBackgroundColor({ color: '#B0BEC5' });
    chrome.action.setBadgeText({ text: ' ' });
    }
}

/**
 * Add a listener for changes to chrome.storage.
 * When a change is detected, update the config object
 * and fetch the latest departure time data.
 */
chrome.storage.onChanged.addListener(() => {
  chrome.alarms.clear();
     init().then(checkActiveTime).then(fetchDepartureTimes).catch(error => {
      console.error(error)
    });    
})

/**
 * Listener for the alarm to fetch the latest data
 */

chrome.alarms.onAlarm.addListener(() => {
  init().then(checkActiveTime).then(fetchDepartureTimes).catch(error => {
    console.error(error)
  }); 
});


/**
 * Checks wether the functions should continue running or wait untill the next day
 * @returns a Chrome Alarm to  
 */

function checkActiveTime() {
  var date = new Date();
  if (config.selectedDays.includes(date.getDay())) {
    var currentHours = config.activeTime.match(/^\d+/)[0];
    var currentMinutes = config.activeTime.match(/\d+$/)[0];
    var diff = (currentHours - date.getHours()) * 60 + (currentMinutes - date.getMinutes());
    if (diff > 0) {
      return { then: function () { chrome.alarms.create({ delayInMinutes: diff }); } }
    }
  } else {
    var timeTillNextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1) - date;
    var minutes = Math.floor(timeTillNextDay / (1000 * 60));
    return { then: function () { chrome.alarms.create({ delayInMinutes: minutes }); } }
  }
}

/**
 * Fetch the latest departure time data for the
 * specified line from the ovapi API.
 */

async function fetchDepartureTimes(){
  if(config.line === undefined){
    return console.error("An error occurred while fetching departure data");
  } else {
  var soonestDeparture = new Date((new Date()).valueOf() + 1000*3600); //Set the date to 1 hour in the future
  const lines = config.line.split(",")
  try {
    const responses = await Promise.all(lines.map(line => fetch(`http://v0.ovapi.nl/line/${line}`, {
      method: 'GET',
      redirect: 'follow',
      mode: 'no-cors'
    })));
    const data = await Promise.all(responses.map(response => response.json()));

    data.forEach(data => {
      lines.forEach(line =>{
        if(soonestDeparture > parseSoonestDeparture(data[line]))
          soonestDeparture = parseSoonestDeparture(data[line])
      })
    })
  } catch (error) {
    console.error("An error occurred while fetching departure data:", error);
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' })
  }
  return setAlarm(soonestDeparture);
}
}


/**
 * Find the soonest departure time from the
 * provided departure time data, and return a Data Object
 */

const parseSoonestDeparture = result =>{
  if(result != undefined && Object.keys(result.Actuals).length !== 0){
  const currentTime = new Date();
  const departureTimes = Object.values(result.Actuals)
    .map(actual => actual.ExpectedDepartureTime)
    .filter(time => new Date(time) > currentTime);
    if (departureTimes.length === 0) {
      console.error("No upcoming departures found.");
      return;
    }
  return new Date(Math.min(...departureTimes.map(Date.parse)))
}
}


/**
 * 
 * @param {Date} departureTime - The time of departure for the earliest ferry
 * This function takes the departure time and calculates when to send a notification and for how long to sleep to fetch the latest departure time 
 */

function setAlarm(departureTime) {
  const countDown = Math.floor((departureTime - new Date()) / (1000 * 60));
  const timeToNotification = countDown - config.delayInMinutes;
  if (countDown <= 0) {
    chrome.action.setBadgeText({ text: '' })
    chrome.alarms.create({ delayInMinutes: 1 });
  } else {
    if (timeToNotification < 1) {
      sendNotification(countDown);
    }
    chrome.alarms.create({ delayInMinutes: (timeToNotification <= 0 ? countDown : timeToNotification) });
    if(config.countDown){badgeCountDown(countDown);}
  }

}

/**
 * 
 * @param {Int} countDown - The time left untill the ferry departs.
 */

function badgeCountDown(countDown) {
  chrome.action.setBadgeBackgroundColor({ color: '#add8e6' }) 
  chrome.action.setBadgeText({ text: '' + countDown })
  const interval = setInterval(() => {
    chrome.action.setBadgeText({ text: '' + countDown })
    countDown--;
    if (countDown < 0) {
      clearInterval(interval);
    }
  }, 60000);
}

/**
 * 
 * @param {String} countDown - The time left untill the ferry departs.
 */
function sendNotification(countDown) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/logo.png',
    title: 'The ferry is leaving in ' + countDown + ' minutes!',
    message: 'Time to catch the ferry!',
    buttons: [
      { title: 'Snooze' }
    ],
    priority: 0
  });
}