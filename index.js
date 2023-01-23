const path = require('path');
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

require('dotenv').config();

const staticPath = path.join(__dirname, '/public');

app.use(express.json());
app.use(express.static(staticPath));

const port = process.env.PORT || 3000;

app.post('/login', (req, res) => {
    const name = req.body.name;
    const pass = req.body.pass;
    if (name === process.env.APPUSER && pass === process.env.APPPASS) {
        res.status(200).send({
            success: true,
        })
    } else {
        res.status(400).send({
            success: false,
        })
    }
})


app.post('/comment', async (req, res) => {
    const userName = req.body.name;
    const postUrl = req.body.url;

    let donePosts = [];
    let falsePosts = [];

    const args = [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--blink-settings=imagesEnabled=false",
    ];
    const options = {
        args,
        headless: true,
        ignoreHTTPSErrors: true,
    };

    try {

        const browser = await puppeteer.launch(options);
        let page = await browser.newPage();
        await page.goto('https://www.instagram.com/');
        page.setDefaultNavigationTimeout(0);
        await page.waitForSelector('input[name=username]');
        await page.waitForSelector('input[name=password]');
        await page.type('input[name=username]', userName);
        await page.type('input[name=password]', process.env.PASS);
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'load' });
        console.log('>>> USER LOGGED IN <<<<')
        await page.goto(postUrl, { "waitUntil": "load" });
        await page.waitForSelector('article > div > div > div > div > div > a');
        let hrefs = await page.$$eval('a', as => as.map(a => a.href));
        hrefs = hrefs.filter(a => a.includes('/p/'))

        for (let i = 0; i < hrefs.length; i++) {

            page = await browser.newPage();
            await page.goto(hrefs[i], { "waitUntil": 'domcontentloaded' });
            try {
                await page.waitForSelector('form > textarea');
                await page.type(' form > textarea', 'Promote it on @social_.art.blog');
                await page.keyboard.press('Tab');
                await page.keyboard.press('Enter');
                donePosts.push(hrefs[i]);
                console.log('Enable Comment => ', hrefs[i])
            } catch (error) {
                falsePosts.push(hrefs[i]);
                console.log('Disable Comment => ', hrefs[i])
                continue;
            }

        }

        browser.close();
        res.status(200).send({
            success: true,
            donePosts,
            falsePosts,
        })

    } catch (err) {
        console.log(err);
        res.status(500).send({
            success : false,
            err : err
        })
    }

})

app.listen(port, (err) => {
    if (err) throw err;
    console.log(`Server is running at ${port}`)
});
