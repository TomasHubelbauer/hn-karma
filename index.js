const https = require('https');
const fs = require('fs');
let email;
try {
  email = require('../self-email');
} catch (error) {
  // Ignore the failure to reference the self-email script on agents which don't have it
}

const user = process.argv[2];
if (!user) {
  throw new Error('The `user` command line argument value not provided.');
}

const token = process.argv[3];

/** @type {https.RequestOptions} */
const options = token ?
  {
    protocol: 'https:',
    host: 'news.ycombinator.com',
    headers: {
      Cookie: `user=${user}&${token}`,
    }
  }
  : `https://news.ycombinator.com/user?id=${user}`;

const request = https.request(options, response => {
  if (response.statusCode !== 200 || response.statusMessage !== 'OK') {
    throw new Error(`Expected 200 OK but got ${response.statusCode} ${response.statusMessage}.`);
  }

  response.setEncoding('ascii');
  let content = '';
  response.on('data', chunk => content += chunk);
  response.on('end', () => {
    const regex = token
      ? new RegExp(`<a id='me' href="user\\?id=${user}">${user}<\\/a>\\s+\\((?<karma>\\d+)\\)`, 'gm')
      : new RegExp(`<td valign="top">karma:<\\/td><td>\\s*(?<karma>\\d+)\\s*<\/td>`);
    const match = regex.exec(content);
    const karma = Number(match.groups.karma);
    console.log(karma);
    let oldKarma;
    try {
      oldKarma = Number(fs.readFileSync('karma.hn', { encoding: 'ascii' }));
    } catch (error) {
      // Ignore the failed attempt to read the old karma if the file doesn't exist yet
    }

    fs.writeFile('karma.hn', karma, () => void 0);
    if (email) {
      email(`
From: Hacker News Karma <bot@hubelbauer.net>
To: Tomas Hubelbauer <tomas@hubelbauer.net>
Subject: Hacker News Karma: ${karma}
Content-Type: text/html

Your Hacker News karma is ${karma}.
      ${
        oldKarma && oldKarma !== karma
          ? `It's ${Math.abs(karma - oldKarma)} ${Math.sign(karma - oldKarma) === 1 ? 'up' : 'down'} since yesterday.`
          : 'It has seen no change since yesterday.'
        }

Thanks!
`);
    }
  });
});

request.end();
