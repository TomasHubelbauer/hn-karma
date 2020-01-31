const https = require('https');
const fs = require('fs');

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
    console.log(match.groups.karma);
    fs.writeFile('karma.hn', match.groups.karma, () => void 0);
  });
});

request.end();
