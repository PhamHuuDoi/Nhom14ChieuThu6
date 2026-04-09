const {google} = require('googleapis');
require('dotenv').config();
const { CLIENT_ID, CLIENT_SECRET, GOOGLE_LOGIN_URI } = process.env;
const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    GOOGLE_LOGIN_URI
);
const oauth2 = google.oauth2({
        auth: oAuth2Client,
        version: 'v2',
    });

module.exports = {
    oAuth2Client,
    oauth2,
};