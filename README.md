# another-sickawesomeness

A simple website archiver with workers.
App is made with NodeJS with Express, Kue and website scraper.



## Routes:

`/archive`

Takes in an array of site urls in JSON body.
Returns a list of ID's in queue

`/archive/:id`

Returns position in queue with status code 202.
Returns 200 with a string if id not found in queue.

## Install
##### Install redis:
```
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
```

Or follow instructions from https://redis.io/topics/quickstart

Start redis server with `redis-server`

##### Install node
Install with npm: `npm install`

Start with: `npm start`

