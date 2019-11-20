const express = require('express');
const superagent = require('superagent');
const open = require('open');
const inquirer = require('inquirer');

const app = express();
const PORT = 11011;
let server;

const DASHBOARD_URL = 'https://developer.spotify.com/dashboard/applications';
const AUTHORIZE_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const AVAILABLE_SCOPES = [
    'user-modify-playback-state',
    'user-top-read',
    'user-read-playback-state',
    'user-read-currently-playing',
    'user-read-recently-played',
    'user-read-private',
    'user-read-email',
    'user-follow-read',
    'user-follow-modify',
    'user-library-read',
    'user-library-modify',
    'playlist-read-private',
    'playlist-modify-private',
    'playlist-modify-public',
    'playlist-read-collaborative',
    'app-remote-control',
    'streaming',
];

console.log();
console.log(`The first thing you\'ll need to do is visit Spotify and create an application if you don\t already have one. ${DASHBOARD_URL}`);
console.log();
console.log(`Once you have your application created, you have to set your application\'s Redirect URI to "${REDIRECT_URI}"`);
console.log();

inquirer.prompt([
    { type: 'input', name: 'clientId', message: 'What is your application\'s client id?' },
    { type: 'input', name: 'clientSecret', message: 'What is your application\'s client secret?' },
    { type: 'checkbox', name: 'scopes', choices: AVAILABLE_SCOPES, message: 'What permissions does your app need? (Use space to select all that apply)' }
]).then(res => {
    const scopes = encodeURIComponent(res.scopes.join(' '));
    const authUrl = `${AUTHORIZE_URL}?response_type=code&client_id=${res.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    startServer(res.clientId, res.clientSecret)
        .then(() => open(authUrl));
});

function startServer(clientId, clientSecret) {
    return new Promise((resolve, reject) => {
        app.get('/callback', (req, res) => {
            if (req.query['error'] === 'access_denied') {
                res.send(generateFailedMarkup());
                server && server.close();
                return;
            }

            const code = req.query['code'];
            superagent
                .post(TOKEN_URL)
                .auth(clientId, clientSecret)
                .type('form')
                .send({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI
                })
                .then(tokens => {
                    res.send(generateSuccessMarkup(code, tokens.body.refresh_token, tokens.body.access_token, tokens.body.expires_in));
                    server && server.close();
                });
        });
    
        server = app.listen(PORT, () => resolve());
    });
}

function generateFailedMarkup() {
    return `<html>
    <head>
        <style>
            body {
                font-family: Arial, Helvetica, sans-serif;
            }

            .container {
                display: flex;
                justify-content: center;
                flex-direction: column;
                padding: 24px;
                overflow: hidden;
            }

            .data {
                word-wrap: break-word;
                white-space: normal;
                background-color: #F9F9F9;
                padding: 8px;
                border-radius: 4px;
            }

            .note {
                margin-left: 16px;
                font-size: 14px;
                font-weight: normal;
                color: darkgray;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>Whoops.. You need to accept the permissions to get your tokens.</h2>
        </div>
    </body>
</html>`
}

function generateSuccessMarkup(authCode, refreshToken, authToken, expiry) {
    return `<html>
        <head>
            <style>
                body {
                    font-family: Arial, Helvetica, sans-serif;
                }

                .container {
                    display: flex;
                    justify-content: center;
                    flex-direction: column;
                    padding: 24px;
                    overflow: hidden;
                }

                .data {
                    word-wrap: break-word;
                    white-space: normal;
                    background-color: #F9F9F9;
                    padding: 8px;
                    border-radius: 4px;
                }

                .note {
                    margin-left: 16px;
                    font-size: 14px;
                    font-weight: normal;
                    color: darkgray;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="group">
                    <h2 class="label">Authorization Code</h2>
                    <pre class="data">${authCode}</pre>
                </div>
                <div class="group">
                    <h2 class="label">Refresh Token</h2>
                    <pre class="data">${refreshToken}</pre>
                </div>
                <div class="group">
                    <h2 class="label">Auth Token<span class="note">Expires in 3600 seconds</span></h2>
                    <pre class="data">${authToken}</pre>
                </div>
            </div>
        </body>
    </html>`
}