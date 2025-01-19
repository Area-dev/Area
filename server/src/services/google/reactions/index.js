const gmailReactions = require('./gmail');
const calendarReactions = require('./calendar');

module.exports = {
  ...gmailReactions,
  ...calendarReactions
}; 