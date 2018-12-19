import Kue from 'kue'
import express from 'express';
import scrape from 'website-scraper';
import physicalCpuCount from 'physical-cpu-count'
import bodyParser from 'body-parser'

const app = express()

// const mockData = [
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
//     "https://google.fi",
//     "https://google.com",
//     "https://google.fr",
// ]

app.use(bodyParser.json())

const queue =  Kue.createQueue({
    redis: {
        host: '0.0.0.0',
        port: 6379
    }
})
const numberOfWorkers = physicalCpuCount * 2 + 1

app.post('/archive', async(req, res) => {
    console.log("POST called ")

    const result = await archiveSites(req.body)
    console.log("lista", await result)
    res.json(result)
})

app.get('/archive/:id', async(req,res) => {
    const pos = await getQuePosition(req.params.id)
    console.log(pos)
    res.json(pos)
})

queue.process('fetchSite', numberOfWorkers, (data, done) => {
    createArchiveSiteJob(data, done)
})

async function createArchiveSiteJob(data, done) {
    try {
        const result = await scrapeSite(data)

        done()

    } catch(e) {
        console.log(e)
    }
}


class ScrapePlugin {
    apply(registerAction) {
        registerAction('beforeStart', async ({options}) => {console.log('Download started', options.urls)});
        registerAction('error', async ({error}) => {console.error(error)});
    }
}

async function scrapeSite(data) {
    const url = data.data.url
    const name = url.replace('http://', '')
    const name2 = name.replace('https://', '')
    const options = {
        urls: [url],
        directory: '/Users/lehtieva/saitit/' + name2 + ' ' + data.id,
        plugins:  [ new ScrapePlugin()]
    }

    const result = await scrape(options);

}


async function archiveSites(sites) {
    const forl = sites.map((site) => {
        return new Promise((resolve, reject) => {

        const job = queue.create('fetchSite', {
            url: site
        })
            .removeOnComplete(true)
            .delay(5000)
            .attempts(3)
            .save(() => {
                resolve(job.id)
            })
        })
    })

    return Promise.all(forl).then((id) => {
        return id
    })
}

async function getQuePosition(id) {
    return new Promise((resolve, reject) => {
        console.log("id ", id)

    queue.inactive((err, ids) => {
        console.log(ids)
            let position = 0
            ids.some((inactiveId) => {

                if (id !=  inactiveId) {
                    position++
                    return false
                } else {
                    return true
                }

            })
        resolve(position + 1) // Plus one to count itself
        })
    })
}

app.listen(3000)
Kue.app.listen(3001);

