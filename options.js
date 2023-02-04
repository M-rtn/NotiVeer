
function getSelectedDays() {
  let selectedDays = [];
  let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let i = 0; i < days.length; i++) {
      let day = days[i];
      let checkbox = document.getElementById(day.toLowerCase());
      if (checkbox.checked) {
          selectedDays.push(i);
      }
  }
  return selectedDays;
}

function setSelectedDays(array){
  let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (let i = 0; i < days.length; i++) {
    let day = days[i];
    let checkbox = document.getElementById(day.toLowerCase());
    checkbox.checked = array.includes(i);
}
}

// Saves options to chrome.storage.sync.
function save_options() {
  var line = document.getElementById('line').value;
  var delayInMinutes = document.getElementById('delayInMinutes').value;
  var activeTime = document.getElementById('activeTime').value;
  var countDown = document.getElementById('countDown').checked;
  var selectedDays = getSelectedDays();
  chrome.storage.sync.set({
    line: line,
    delayInMinutes: delayInMinutes,
    activeTime: activeTime,
    countDown : countDown,
    selectedDays : selectedDays
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 7500);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    line: 'GVB_906_1',
    delayInMinutes: 10,
    activeTime: '17:00',
    countDown: false,
    selectedDays: []
  }, function(items) {
    document.getElementById('line').value = items.line;
    document.getElementById('delayInMinutes').value = items.delayInMinutes;
    document.getElementById('activeTime').value = items.activeTime;
    document.getElementById('countDown').checked = items.countDown;
    setSelectedDays(items.selectedDays)
  });
}

  document.addEventListener('DOMContentLoaded', restore_options);
  document.getElementById('save').addEventListener('click',save_options);
