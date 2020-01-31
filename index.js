const https = require('https');
const fs = require('fs');

const user = process.argv[2];
if (!user) {
  throw new Error('The `user` command line argument #1 value not provided.');
}

const token = process.argv[3];
if (!token) {
  throw new Error('The `token` command line argument #2 value not provided.');
}

/** @type {https.RequestOptions} */
const options = {
  protocol: 'https:',
  host: 'news.ycombinator.com',
  headers: {
    Cookie: `user=${user}&${token}`,
  }
};

const request = https.request(options, response => {
  if (response.statusCode !== 200 || response.statusMessage !== 'OK') {
    throw new Error(`Expected 200 OK but got ${response.statusCode} ${response.statusMessage}.`);
  }

  response.setEncoding('ascii');
  let content = '';
  response.on('data', chunk => content += chunk);
  response.on('end', () => {
    const regex = new RegExp(`<a id='me' href="user\\?id=${user}">${user}<\\/a>\\s+\\((?<karma>\\d+)\\)`, 'gm');
    const match = regex.exec(content);
    console.log(match.groups.karma);
    fs.writeFile('karma.hn', match.groups.karma, () => void 0);
  });
});

request.end();
