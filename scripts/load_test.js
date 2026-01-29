// Usage: node backend/scripts/load_test.js
// Node 18+ has native fetch, no need to import.

const BASE_URL = 'http://localhost:4000'; // Ganti dengan port backendmu
const CONCURRENT_USERS = 50;
const TOTAL_REQUESTS = 100;

async function simulateUser(id) {
    const start = Date.now();
    try {
        // 1. Hit Public Endpoint
        const res = await fetch(`${BASE_URL}/api/categories/best-selling`); // Sesuaikan route
        if (!res.ok) throw new Error(`Status ${res.status}`);

        // 2. Simulasi delay baca
        // await new Promise(r => setTimeout(r, 500)); 

        const duration = Date.now() - start;
        console.log(`User ${id}: Success (${duration}ms)`);
        return { success: true, duration };
    } catch (e) {
        console.log(`User ${id}: Failed - ${e.message}`);
        return { success: false, error: e.message };
    }
}

async function runLoadTest() {
    console.log(`🚀 Starting Load Test via ${BASE_URL}`);
    console.log(`Simulating ${CONCURRENT_USERS} concurrent users...`);

    const promises = [];
    for (let i = 0; i < TOTAL_REQUESTS; i++) {
        promises.push(simulateUser(i));
        // Simple throttling to batch requests
        if (i % CONCURRENT_USERS === 0) {
            await new Promise(r => setTimeout(r, 100));
        }
    }

    const results = await Promise.all(promises);

    const successful = results.filter(r => r.success);
    const avgTime = successful.reduce((acc, curr) => acc + curr.duration, 0) / successful.length;

    console.log('\n--- 📊 Results ---');
    console.log(`Total Requests: ${TOTAL_REQUESTS}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${results.length - successful.length}`);
    console.log(`Average Latency: ${avgTime.toFixed(2)}ms`);
}

// Check Node version for fetch
if (parseInt(process.versions.node) < 18) {
    console.error("Please use Node.js 18+ or install node-fetch");
} else {
    runLoadTest();
}
