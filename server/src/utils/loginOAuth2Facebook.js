const axios = require('axios');
require('dotenv').config();
const getFacebookLoginUrl = () => {
    return `https://www.facebook.com/v19.0/dialog/oauthứclient_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.FACEBOOK_REDIRECT_URI}&scope=email,public_profile`;
};

const getFacebookAccessToken = async (code) => {
    const { data } = await axios.get(
        'https://graph.facebook.com/v19.0/oauth/access_token',
        {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
                code,
            },  
        }
    );

    return data.access_token;
};

const getFacebookUserInfo = async (accessToken) => {
    const { data } = await axios.get(
        'https://graph.facebook.com/v19.0/me',
        {
            params: {
                fields: 'id,name,email,picture',
                access_token: accessToken,
            },
        }
    );

    return data;
};

module.exports = {
    getFacebookLoginUrl,
    getFacebookAccessToken,
    getFacebookUserInfo,
};