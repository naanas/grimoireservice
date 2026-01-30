
const jwt = require('jsonwebtoken');

// Valid ID from previous log
const categoryId = '49a80323-85c5-4182-b5bb-540e52cab9fc';
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLWlkIiwicm9sZSI6IkFETUlOIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsImlhdCI6MTc2OTc0NDg1MX0.um7xto9VRqEpJMtN10QCMRl7zf8UX-OgvYD11oPs9RA";

async function debugUpdate() {
    console.log(`Testing PATCH /api/admin/categories/${categoryId}...`);

    // Payload mimicking frontend
    const payload = {
        profitMargin: 15,
        isActive: true,
        name: "8 Ball Pool Updated"
    };

    try {
        const response = await fetch(`http://localhost:4000/api/admin/categories/${categoryId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response: ${text}`);

    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

debugUpdate();
