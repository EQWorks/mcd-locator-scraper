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
});

async function scrapeData(storeId) {
    const url = `https://www.mcdonalds.com/ca/en-ca/location/a/a/22/${storeId}.html`

    const browser = await puppeteer.launch({
        userDataDir: './user_data',
      })
    const page = await browser.newPage()
    
    let storeName = ''
    let address = ''
    
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await delay(1000)
    
    // Try to get the store name
    try {
        storeName = await page.$eval('h1.cmp-restaurant-detail__details-meta-title', el => el.textContent.trim())
    } catch (e) {
        console.warn(`Failed to find store name for StoreID: ${storeId}`)
    }

    // Try to get the address
    try {
        address = await page.$eval('span.cmp-restaurant-detail__details-meta-address', el => el.textContent.trim().replace(/<br\s*\/?>/i, ", "))
    } catch (e) {
        console.warn(`Failed to find address for StoreID: ${storeId}`)
    }

    await browser.close()
    
    return { storeName, address }
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
                const details = await scrapeData(data.store_no)
                console.log(`Store: ${data.store_no} - ${details.storeName} - ${details.address}`)
                // Write the scraped data immediately after fetching
                await csvWriter.writeRecords([{
                    store_no: data.store_no,
                    customers_unique: data.customers_unique,
                    'Store Name': details.storeName || '',
                    Address: details.address || '',
                }])

                await delay(1000)
            }

            console.log('Process Completed!')
        })
}

main().catch(console.error)
