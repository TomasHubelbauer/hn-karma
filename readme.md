# Hacker News Karma

A Node script for parsing out your Hacker News karma from the HN home page.

## Running

`node . hn-user hn-token`

- `hn-user` is your Hacker News user name
- `hn-token` is the value after `&` in the Hacker News cookie

The script writes the HN karma to both its output and to a `karma.hn` file.
