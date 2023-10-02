# McD's Locator Scraper

This tool helps scrape store details from McDonald's website based on store numbers provided in a CSV file.

## Preparing Input Data

Before you start, follow these steps:

1. Visit [this Google Spreadsheet](https://docs.google.com/spreadsheets/d/1LTMPTdds-YGHgsxX6hdqsySIgh1SCMNwYK8U5DiHDr0/edit#gid=0).
2. Download the spreadsheet data.
3. Save the downloaded data as `input.csv` in the `data` directory of this project.

## Running the Scraper

Run the scraper with the usual command:

```
yarn start
```

## Output

After successfully running the scraper, you'll find the results in `data/output.csv`.


## Using a Remote Browser with Bright Data

If you want to use a remote browser via Bright Data for your scraping tasks, follow these steps:

### Setup

1. Visit [Bright Data](https://brightdata.com/) and create an account.
2. Once your account is set up, add a scraping browser.
3. Navigate to the **Access parameters** tab in your Bright Data account.
4. Grab the following details:
   - `BRIGHT_DATA_USERNAME`
   - `BRIGHT_DATA_PASSWORD`
   - `BRIGHT_DATA_HOST`

5. Place these details in your `.env` file in the root of this project.

For a more detailed guide, you can watch [this video](https://youtu.be/qo_fUjb02ns?si=8lfNm3sDZWEZ8oHy).

**Note**: You don't need to do this if you don't want to use a remote browser. Also, be aware that using Bright Data will incur additional costs.

Happy scraping!
