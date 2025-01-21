const express = require('express');
const axios = require('axios');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// HTTPS agent with SSL validation
const httpsAgent = new https.Agent({
    rejectUnauthorized: true  // Ensure SSL certificates are validated
});

// Route handler
app.get('/api', async (req, res) => {
    const key = req.query.key;
    if (!key) {
        return res.status(400).json({ error: 'No API key provided' });
    }

    try {
        // Check primary server status with SSL validation
        const status = await fetchUrl("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch1.txt");

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

// Fetch content from URL with axios and SSL validation
async function fetchUrl(url) {
    const response = await axios.get(url, { httpsAgent });
    return response.data;
}

// Secondary status check
async function checkSecondaryStatus(res, key) {
    const checkStatus = await fetchUrl("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch2.txt");

    if (checkStatus.includes("START")) {
        res.json({ message: "ACTIVE" });
    } else if (checkStatus.includes("CHK")) {
        await validateSubscription(res, key);
    } else {
        res.status(500).json({ message: "Something went wrong." });
    }
}

// Validate subscription
async function validateSubscription(res, key) {
    const blockList = await fetchUrl("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/bchk.txt");

    // Check if user is blocked
    if (blockList.includes(key)) {
        res.status(403).json({ message: "BLOCKED" });
    } else {
        const subscriptionData = await fetchUrl("https://raw.githubusercontent.com/George-Codr/Database/refs/heads/main/ch3.txt");

        // Check if key exists
        const entries = subscriptionData.split("\n");
        const userEntry = entries.find(entry => entry.includes(key));

        if (userEntry) {
            const [userKey, deviceId, expiryDate, username] = userEntry.split("|");

            if (isValidDate(expiryDate)) {
                const expiry = parseDate(expiryDate);
                await processSubscription(res, userKey, deviceId, username, expiry, blockList);
            } else {
                res.status(400).json({ error: "Invalid date format in subscription data." });
            }
        } else {
            res.status(401).json({ message: "NONE" });
        }
    }
}

// Date validation and parsing
function isValidDate(dateString) {
    const [day, month, year] = dateString.split("-");
    const date = new Date(`${year}-${month}-${day}`);
    return date instanceof Date && !isNaN(date);
}

function parseDate(dateString) {
    const [day, month, year] = dateString.split("-");
    return new Date(`${year}-${month}-${day}`);
}

// Process subscription with block list check
async function processSubscription(res, userKey, deviceId, username, expiryDate, blockList) {
    // Check if user is blocked
    if (blockList.includes(userKey)) {
        res.status(403).json({ message: "BLOCKED" });
    } else {
        const status = checkExpiration(expiryDate);
        if (status === "ALIVE") {
            res.json({
                message: "ACTIVE",
                user: username,
                device: deviceId,
                expires: expiryDate
            });
        } else {
            res.json({ message: "EXPIRED" });
        }
    }
}

// Check if subscription is expired
function checkExpiration(expiryDate) {
    const currentDate = new Date();
    return expiryDate > currentDate ? "ALIVE" : "EXPIRED";
}

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
