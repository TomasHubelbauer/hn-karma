const https = require('https');
const fs = require('fs');
const email = require('../self-email');
const headers = require('../self-email/headers');
const footer = require('../self-email/footer');

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

const request = https.request(options, response => {
  if (response.statusCode !== 200 || response.statusMessage !== 'OK') {
    throw new Error(`Expected 200 OK but got ${response.statusCode} ${response.statusMessage}.`);
  }

  response.setEncoding('ascii');
  let content = '';
  response.on('data', chunk => content += chunk);
  response.on('end', async () => {
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

    const change = oldKarma && oldKarma !== karma
      ? `It's ${Math.abs(karma - oldKarma)} ${Math.sign(karma - oldKarma) === 1 ? 'up' : 'down'}`
      : 'It has seen no change'
      ;

    await email(
      headers(karma, 'Hacker News'),
      `Your HN karma is ${karma}. ${change} since yesterday.`,
      ...footer('Hacker News')
    );
  });
});

request.end();
