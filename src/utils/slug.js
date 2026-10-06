const crypto = require('crypto');

function generateSlug() {
  return crypto.randomBytes(5).toString('hex');
}

module.exports = { generateSlug };
