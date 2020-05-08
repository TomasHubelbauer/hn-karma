const https = require('https');
const fs = require('fs-extra');
const path = require('path');
const email = require('../self-email');
const { eml, subject, sender, recipient } = require('../self-email');

const user = process.argv[2] || process.env.HN_USER;
if (!user) {
  throw new Error('The `user` command line argument or `HN_USER` environment variable not provided.');
}

const token = process.argv[3] || process.env.HN_TOKEN;

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

const userPageRegex = new RegExp(`<a id='me' href="user\\?id=${user}">${user}<\\/a>\\s+\\((?<karma>\\d+)\\)`, 'gm');
const homePageRegex = new RegExp(`<td valign="top">karma:<\\/td><td>\\s*(?<karma>\\d+)\\s*<\/td>`);

const request = https.request(options, response => {
  if (response.statusCode !== 200 || response.statusMessage !== 'OK') {
    throw new Error(`Expected 200 OK but got ${response.statusCode} ${response.statusMessage}.`);
  }

  response.setEncoding('ascii');
  let content = '';
  response.on('data', chunk => content += chunk);
  response.on('end', async () => {
    const regex = token ? userPageRegex : homePageRegex;
    const match = regex.exec(content);
    if (!match) {
      throw new Error(`The pattern ${regex.source} not found on ${JSON.stringify(options)}.`);
    }

    const karma = Number(match.groups.karma);
    console.log(karma);
    let oldKarma;
    try {
      oldKarma = Number(await fs.readFileSync(path.join(__dirname, 'karma.hn'), { encoding: 'ascii' }));
    } catch (error) {
      // Ignore the failed attempt to read the old karma if the file doesn't exist yet
    }

    await fs.writeFile(path.join(__dirname, 'karma.hn'), karma, () => void 0);

    const change = oldKarma && oldKarma !== karma
      ? `It's ${Math.abs(karma - oldKarma)} ${Math.sign(karma - oldKarma) === 1 ? 'up' : 'down'}`
      : 'It has seen no change'
      ;

    await email(
      eml(
        subject(`HN Karma: ` + karma),
        sender('Hacker News <bot@hubelbauer.net>'),
        recipient('Tomas Hubelbauer <tomas@hubelbaur.net>'),
        `Your HN karma is ${karma}. ${change} since yesterday.`
      )
    );
  });
});

request.end();

// TODO: Use node-fetch and export a promise for the runner
module.exports = new Promise(resolve => resolve());
