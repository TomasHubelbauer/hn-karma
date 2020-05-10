const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');

module.exports = async function (/** @type {string} */ user) {
  user = user || process.env.HN_USER;
  if (!user) {
    throw new Error('The `user` command line argument or `HN_USER` environment variable not provided.');
  }

  const response = await fetch(`https://news.ycombinator.com/user?id=${user}`);
  const text = await response.text();
  const regex = /<tr>\s*<td[^>]+>\s*karma:\s*<\/td>\s*<td>\s*(?<karma>\d+)\s*<\/td><\/tr>/;
  const match = regex.exec(text);
  if (!match) {
    throw new Error(`The pattern ${regex.source} not found on https://news.ycombinator.com/user?id=${user}.`);
  }

  const karmaHnFilePath = path.join(__dirname, 'karma.hn');

  const karma = Number(match.groups.karma);
  console.log(`Hacker News karma: ${karma}`);

  let oldKarma;
  try {
    oldKarma = Number(await fs.readFileSync(karmaHnFilePath, { encoding: 'ascii' }));
  } catch (error) {
    // Ignore the failed attempt to read the old karma if the file doesn't exist yet
  }

  await fs.writeFile(karmaHnFilePath, karma);

  if (oldKarma) {
    const change = oldKarma !== karma
      ? `It's ${Math.abs(karma - oldKarma)} ${Math.sign(karma - oldKarma) === 1 ? 'up' : 'down'}`
      : 'It has seen no change'
      ;

    return `Hacker News karma is ${karma}. ${change} since last time.`;
  }

  return `Hacker News karma is ${karma}.`;
}

if (process.cwd() === __dirname) {
  module.exports(process.argv[2]);
}
