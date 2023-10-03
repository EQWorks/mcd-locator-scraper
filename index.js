import puppeteer from 'puppeteer'
import fs from 'fs'
import csvParser from 'csv-parser'
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer'


const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const csvWriter = createCsvWriter({
    path: 'data/output.csv',
    header: [
        { id: 'store_no', title: 'store_no' },
        { id: 'customers_unique', title: 'customers_unique' },
        { id: 'Store Name', title: 'Store Name' },
        { id: 'Address', title: 'Address' },
    ]
})

async function getBrowser ({ remote = false }) {
    try {
        let browser
        if (!remote) {
            browser = await puppeteer.launch({
                userDataDir: './user_data',
            })
        } else {
            const brUserName = process.env.BRIGHT_DATA_USERNAME
            const brPassword = process.env.BRIGHT_DATA_PASSWORD
            const brHost = process.env.BRIGHT_DATA_HOST
            const auth = `${brUserName}:${brPassword}`

            browser = await puppeteer.connect({
                browserWSEndpoint: `wss://${auth}@${brHost}`,
            })
        }
        return browser
    } catch (error) {
        console.error('Failed to connect to Bright Data Proxy', error)
    }
}

let browser

async function getBrowserInstance() {
    if (browser && browser.isConnected()) {
        return browser
    }

    if (browser) {
        await browser.close() // Close any previously opened browser, if any
    }

    return getBrowser({ remote: process.env.REMOTE })
}

async function scrapeData(storeId) {
    const caUrl = `https://www.mcdonalds.com/ca/en-ca/location/p/city/address/${storeId}.html`
    const usUrl = `https://www.mcdonalds.com/us/en-us/location/p/city/address/${storeId}.html`

    const browser = await getBrowserInstance()
    const page = await browser.newPage()

    // Block images, styles, fonts etc. to reduce data usage
    await page.setRequestInterception(true)
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
            req.abort()
        } else {
            req.continue()
        }
    })

    let storeName = ''
    let address = ''
    
    for (const url of [usUrl, caUrl]) {
        try {
            await page.goto(url, { waitUntil: 'networkidle2' })
            await delay(1000)
            console.log(`Scraping ${url}`)

            // Try to get the store name
            storeName = await page.$eval('h1.cmp-restaurant-detail__details-meta-title', el => el.textContent.trim())
            
            // Try to get the address
            address = await page.$eval('span.cmp-restaurant-detail__details-meta-address', el => el.textContent.trim().replace(/<br\s*\/?>/i, ", "))
            if (storeName && address) {
                console.log(`Found details for StoreID: ${storeId} on ${url}`)
                break  // If both details are found, break out of the loop
            }
        } catch (e) {
            console.warn(`Failed to find details for StoreID: ${storeId} on ${url}`)
        }
    }

    await page.close()
    
    return { storeName, address }
}

async function scrapeDataWithRetry(storeId, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await scrapeData(storeId)
        } catch (error) {
            console.error(`Error scraping data for storeId ${storeId}. Retry ${i + 1} of ${retries}`, error)
            await delay(5000) // wait for 5 seconds before retrying
        }
    }
    throw new Error(`Failed to scrape data for storeId ${storeId} after ${retries} retries`)
}

async function main() {
    const inputData = []
    
    fs.createReadStream('data/input.csv')
        .pipe(csvParser())
        .on('data', (row) => inputData.push(row))
        .on('end', async () => {
            
            // Write headers first
            await csvWriter.writeRecords([])

            for (const data of inputData) {
                console.log(`Processing Store: ${data.store_no}`)
                let details = {}
                let scraped = false // Flag to determine if we scraped data or used existing

                // Check if 'Store Name' or 'Address' is missing in the input data
                if (!data['Store Name'] || !data['Address']) {
                    scraped = true
                    details = await scrapeDataWithRetry(data.store_no)
                    console.log(`Scraped Data for Store: ${data.store_no} - ${details.storeName} - ${details.address}`)
                } else {
                    details.storeName = data['Store Name']
                    details.address = data['Address']
                    console.log(`Using Existing Data for Store: ${data.store_no} - ${details.storeName} - ${details.address}`)
                }
                
                // Write the data (either scraped or existing) to the output file
                await csvWriter.writeRecords([{
                    store_no: data.store_no,
                    customers_unique: data.customers_unique,
                    'Store Name': details.storeName || '',
                    Address: details.address || '',
                }])

                // Reopen the browser every 50 records to keep the connection fresh and avoid issues
                if (inputData.indexOf(data) % 50 === 0) {
                    await getBrowserInstance()
                }

                // Only delay if data was scraped
                if (scraped) {
                    await delay(1000)
                }
            }

            if (browser && browser.isConnected()) {
                await browser.close()  // Close the browser after all tasks are completed
            }

            console.log('Process Completed!')
        })
}

main().catch(console.error)
