# scraper worker

A simple website archiver with workers.
App is made with NodeJS with Express, Kue (with redis) and website scraper.



## Routes:

`/archive`

Takes in an array of site urls in JSON body.
Returns a list of ID's put in the queue.
URLS must have "http://" or "https://" in the beginning of the string.

`/archive/:id`

Returns position in queue with status code 202.

If job ID is not found in queue but is found in the archived list, app responds the archived site and redirects user to it.

If the job ID is not found in queue nor in archived list, a "Not found" string is returned.

## Install
##### Install redis:
```
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
```
From documentation:
```
It is a good idea to copy both the Redis server and the command line interface in proper places, either manually using the following commands:

sudo cp src/redis-server /usr/local/bin/
sudo cp src/redis-cli /usr/local/bin/
Or just using sudo make install.
```

..or follow the instructions from https://redis.io/topics/quickstart

Start redis server with `redis-server`

##### Install node
Install with npm: `npm install`

Start with: `npm start`

App is running at http://localhost:3000
A visual representation of the queue is found at http://localhost:3001
