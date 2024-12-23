const puppeteer = require('puppeteer');

const scrapeAttendance = async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Step 1: Navigate to the login page
        await page.goto('https://erp.cbit.org.in/', { waitUntil: 'networkidle2' });

        // Step 2: Enter the username (Roll No) and click "Next"
        await page.type('#txtUserName', '160123733036P'); // Replace with actual Roll No
        await page.click('#btnNext');
        await page.waitForSelector('#txtPassword', { visible: true }); // Wait for the password field to load

        // Step 3: Enter the password and click "Submit"
        await page.type('#txtPassword', '160123733036P'); // Replace with actual password
        await Promise.all([
            page.click('#btnSubmit'),
            page.waitForNavigation({ waitUntil: 'networkidle2' }), // Wait for navigation to complete
        ]);

        // Step 4: Navigate to the student dashboard by clicking the link
        await page.click('#ctl00_cpStud_lnkStudentMain'); // Replace with the actual link selector
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        // Step 5: Extract attendance data from the table
        const attendanceData = await page.evaluate(() => {
            const rows = document.querySelectorAll('#ctl00_cpStud_grdSubject tr');
            const data = [];

            rows.forEach((row, index) => {
                // Skip the header row
                if (index === 0) return;

                const cells = row.querySelectorAll('td');
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

        // Step 6: Extract total attendance
        const totalAttendance = await page.evaluate(() => {
            const totalRow = document.querySelector(
                '#ctl00_cpStud_grdSubject tr:last-child td:nth-child(6)'
            );
            return totalRow ? totalRow.textContent.trim() : null;
        });

        // Print the results
        console.log('Attendance Data:', attendanceData);
        console.log('Total Attendance:', totalAttendance);

        return { attendanceData, totalAttendance };
    } catch (error) {
        console.error('Error scraping attendance:', error.message);
    } finally {
        await browser.close();
    }
};

scrapeAttendance();
