const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api', async (req, res) => {
    const key = req.query.key;
    if (!key) {
        return res.status(400).json({ error: 'No API key provided' });
    }

    try {
        const status = await fetchUrl("https://raw.githubusercontent.com/Mahobin-Universe/Importer/refs/heads/main/SAVAGE/ch1.txt");

        if (status.includes("ON")) {
            await checkSecondaryStatus(res, key);
        } else if (status.includes("OFF")) {
            res.status(503).json({ message: "MAINTENANCE" });
        } else {
            res.status(500).json({ message: "Something went wrong." });
        }
    } catch (error) {
        res.status(500).json({ error: "An error occurred", details: error.message });
    }
});

async function fetchUrl(url) {
    const response = await axios.get(url);
    return response.data;
}

async function checkSecondaryStatus(res, key) {
    const checkStatus = await fetchUrl("https://raw.githubusercontent.com/Mahobin-Universe/Importer/refs/heads/main/SAVAGE/ch2.txt");

    if (checkStatus.includes("START")) {
        res.json({ message: "Service started successfully." });
    } else if (checkStatus.includes("CHK")) {
        await validateSubscription(res, key);
    } else {
        res.status(500).json({ message: "Something went wrong." });
    }
}

async function validateSubscription(res, key) {
    const subscriptionData = await fetchUrl("https://raw.githubusercontent.com/Mahobin-Universe/Importer/refs/heads/main/SAVAGE/ch3.txt");

    if (subscriptionData.includes(key)) {
        const [userKey, deviceId, expiryDate, username] = subscriptionData.split("|");

        if (isValidDate(expiryDate)) {
            const expiry = new Date(expiryDate.split('-').reverse().join('-'));
            await processSubscription(res, userKey, deviceId, username, expiry);
        } else {
            res.status(400).json({ error: "Invalid date format in subscription data." });
        }
    } else {
        res.status(401).json({ error: "NONE" });
    }
}

function isValidDate(dateString) {
    const [day, month, year] = dateString.split("-");
    const date = new Date(`${year}-${month}-${day}`);
    return date instanceof Date && !isNaN(date);
}

async function processSubscription(res, userKey, deviceId, username, expiryDate) {
    const blockList = await fetchUrl("https://raw.githubusercontent.com/Mahobin-Universe/Importer/refs/heads/main/SAVAGE/bch.txt");

    if (blockList.includes(userKey)) {
        res.status(403).json({ message: "BLOCKED" });
    } else {
        const status = checkExpiration(expiryDate);
        if (status === "ALIVE") {
            res.json({
                WELCOME: username.trim(),
                DEVICE_ID: deviceId,
                EXPIRED_DATE: expiryDate.toISOString()
            });
        } else {
            res.json({ message: "EXPIRED" });
        }
    }
}

function checkExpiration(expiryDate) {
    const currentDate = new Date();
    return expiryDate > currentDate ? "ALIVE" : "EXPIRED";
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
