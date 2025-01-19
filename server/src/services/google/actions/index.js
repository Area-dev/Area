const gmailActions = require('./gmail');
const calendarActions = require('./calendar');

module.exports = {
  ...gmailActions,
  ...calendarActions
}; 