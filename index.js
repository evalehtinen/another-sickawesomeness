import kue from 'kue'
import express from 'express';
import scrape from 'website-scraper';
import physicalCpuCount from 'physical-cpu-count'
import bodyParser from 'body-parser'
import del from 'del'

const MAX_URLS = 10000; // Maximum number of urls put in the scraping queue.

// const mockData = [
//     "https://google.fi",
//     "https://ilmatieteenlaitos.fi/saa/espoo?day=1,
//     "https://google.fr",
//     "https://google.fi",
//     "https://google.com",
//     "https://google.fr",
//     "https://google.fi",
//     "https://google.com",
//     "https://google.fr",
//     "https://google.fi",
//     "https://google.com",
//     "https://google.fr",
//     "https://google.fi",
//     "https://google.com",
//     "https://google.fr",
//     "https://google.fi",
//     "https://google.com",
//     "https://google.fr",
// ]

const app = express();
del(['archive/*']); // Deletes folders (sites) in archive

app.use(bodyParser.json());
app.listen(3000);
kue.app.listen(3001);  // Visual representation of the queue.
console.log('System up and running, lets do some work');

const localhost = '192.168.1.62'; // Change this

const archivedSitesIds = [];

const queue =  kue.createQueue({
    redis: {
        host: localhost,
        port: 6379
    }
});

queue.on('error', (err) => {
    console.log("Something terrible happened with que", err)
});

const numberOfWorkers = physicalCpuCount * 2 + 1;
queue.process('fetchSite', numberOfWorkers, async(data, done) => {
    try {
        queue.watchStuckJobs();
        await scrapeSite(data);

        console.log("Job done");
        done()

    } catch(e) {
        console.log(e)
    }
});


// Routes

app.post('/archive', async(req, res) => {
    console.log("POST archive called ");
    try {
        const jobsIDs = await createQueForSites(req.body);
        console.log("Jobs IDs", await jobsIDs);
        archivedSitesIds.push(jobsIDs);
        res.json(jobsIDs)
    } catch (e) {
        console.log(e)
    }
});

app.get('/archive/:jobId', async(req,res) => {
    const { jobId } = req.params;
    console.log("GET archive id called", jobId);

    const jobQuePosition = await getQuePosition(jobId);
    if (jobQuePosition > 1) {
        res.status(202).send('Job position in que: ' + jobQuePosition)
    } else {
        const isArchived = archivedSitesIds.find((archivedID) => {
            return archivedID === jobId
        });

        if (isArchived) {
            app.use('/archivedSite', express.static('archive/' + jobId));
            res.redirect('/archivedSite')
        } else {
            res.send('Job not found in queue nor in archives')
        }
    }
});


// Site scraper

class ScrapePlugin {
    apply(registerAction) {
        registerAction('beforeStart', async ({options}) => {console.log('Download started', options.urls)});
        registerAction('error', async ({error}) => {console.error(error)});
    }
}

async function scrapeSite(data) {
    const url = data.data.url;
    const options = {
        urls: [url],
        directory: './archive/' + data.id,
        plugins:  [ new ScrapePlugin()]
    };

    await scrape(options);

    // Uncomment to try very delayed "scraping"
    // return new Promise((resolve, reject) => {
    //     setTimeout(() => {
    //         console.log("WOW that took ages")
    //         resolve()
    //     },8000)
    // })
}

async function createQueForSites(sites) {
    if (sites.length > MAX_URLS) {
        throw('Too many urls. The maximum size of the url list is ' + MAX_URLS)
    }

    const sitesAsJobs = sites.map((site) => {
        return new Promise((resolve, reject) => {

            const job = queue.create('fetchSite', {
                url: site
            })
                .removeOnComplete(true)
                .attempts(3)
                .save((err) => {
                    if (!err) {
                        resolve(job.id)
                    } else {
                        reject(err);
                        console.log("Error adding job to redis", err)
                    }
                })
            })
    });

    return Promise.all(sitesAsJobs).then((id) => {
        return id
    })
}

async function getQuePosition(id) {
    return new Promise((resolve) => {

        queue.inactive((err, ids) => {
            console.log(ids);

            const isInQue = ids.find((inactiveId) => {
                return inactiveId === id
            });

            if (!isInQue) {
                console.log("Job not found in que");
                resolve(0);
                return
            }

            let position = 0;
            ids.some((inactiveId) => {
                position++;
                return id === inactiveId
            });

            position++; // Plus one to count itself
            console.log("Job que position", position);
            resolve(position)
        })
    })
}



