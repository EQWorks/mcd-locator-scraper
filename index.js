import puppeteer from 'puppeteer'
import fs from 'fs'
import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function scrapeData(storeId) {
    const url = `https://www.mcdonalds.com/ca/en-ca/location/a/a/22/${storeId}.html`

    const browser = await puppeteer.launch({
        userDataDir: './user_data',
      })
    const page = await browser.newPage()
    
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    
    await delay(2000) // Add a 2 second delay

    const storeName = await page.$eval('h1.cmp-restaurant-detail__details-meta-title', el => el.innerText)
    const address = await page.$eval('span.cmp-restaurant-detail__details-meta-address', el => el.innerText.trim())
    console.log({ storeName, address })
    await browser.close()
    
    return { storeName, address }
}

async function main() {
    const input = fs.readFileSync('data/input.csv', 'utf8')

    const records = []
    parse(input, {
        columns: true,
        skip_empty_lines: true
    }, async (err, data) => {
        if (err) throw err

        for (let record of data) {
            const { storeName, address } = await scrapeData(record.store_no)
            records.push({
                store_no: record.store_no,
                customers_unique: record.customers_unique,
                'Store Name': storeName,
                Address: address
            })
        }

        stringify(records, { header: true }, (err, output) => {
            if (err) throw err
            fs.writeFileSync('data/output.csv', output)
        })
    })
}

main().catch(console.error)
