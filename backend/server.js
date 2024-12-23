const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path"); // to handle static files

const app = express();
const PORT = process.env.PORT || 5000; // Using a fallback port in case PORT is not set

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from React build folder (only in production)
if (process.env.NODE_ENV === "production") {
    // Serve static files from the 'build' directory
    app.use(express.static(path.join(__dirname, "build")));

    // Serve index.html for any unknown route (this is for React routing)
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, "build", "index.html"));
    });
}

// Endpoint to handle login and scraping
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto("https://erp.cbit.org.in/", { waitUntil: "networkidle2" });

        // Input username
        await page.type("#txtUserName", username);
        await page.click("#btnNext");
        await page.waitForSelector("#txtPassword", { visible: true });

        // Input password
        await page.type("#txtPassword", password);
        await Promise.all([
            page.click("#btnSubmit"),
            page.waitForNavigation({ waitUntil: "networkidle2" }),
        ]);

        // Navigate to the attendance page
        await page.click("#ctl00_cpStud_lnkStudentMain");
        await page.waitForNavigation({ waitUntil: "networkidle2" });

        // Scrape attendance data
        const attendanceData = await page.evaluate(() => {
            const rows = document.querySelectorAll("#ctl00_cpStud_grdSubject tr");
            const data = [];

            rows.forEach((row, index) => {
                if (index === 0) return; // Skip the header row

                const cells = row.querySelectorAll("td");
                if (cells.length === 6) {
                    data.push({
                        subject: cells[1].textContent.trim(),
                        faculty: cells[2].textContent.trim(),
                        classesHeld: cells[3].textContent.trim(),
                        classesAttended: cells[4].textContent.trim(),
                        attendancePercentage: cells[5].textContent.trim(),
                    });
                }
            });

            return data;
        });

        const totalAttendance = await page.evaluate(() => {
            const totalRow = document.querySelector(
                "#ctl00_cpStud_grdSubject tr:last-child td:nth-child(6)"
            );
            return totalRow ? totalRow.textContent.trim() : null;
        });

        await browser.close();

        // Check if we have valid attendance data
        if (!attendanceData || attendanceData.length === 0) {
            return res.status(404).json({ error: "No attendance data found." });
        }

        // Log attendance data for debugging
        console.log("Attendance Data:", attendanceData);
        console.log("Total Attendance:", totalAttendance);

        // Send the attendance data and total attendance
        res.status(200).json({ attendanceData, totalAttendance });
    } catch (error) {
        console.error("Error scraping attendance:", error.message);
        res.status(500).json({ error: "Failed to scrape attendance data." });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
