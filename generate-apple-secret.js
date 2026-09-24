import jwt from 'jsonwebtoken';

// Your Apple Developer values
const TEAM_ID = '4G65K64G73'; // Found in Apple Developer portal (top right)
const KEY_ID = 'HSV536HAB7'; // From when you created the key
const CLIENT_ID = 'com.build-desk.signinservice'; // Your Service ID

// Paste your FULL .p8 file content here - must include BEGIN/END lines and line breaks
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgaueM0ivmm1LcIdXV
v5OFcU2hS1ptkfOLVrZvdBAYh7SgCgYIKoZIzj0DAQehRANCAATxUXyQ6drcbFzj
HEUDgPlDkzoAq5TFl3+rKtTT5X+yIsNZz8SCk8gVnC2TXrexEmD1m+iBr++rUlW7
gjXZOSX0
-----END PRIVATE KEY-----`;

const token = jwt.sign(
  {
    iss: TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 15777000,
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID
  },
  PRIVATE_KEY,
  {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: KEY_ID
    }
  }
);

console.log('Your Client Secret (JWT):');
console.log(token);