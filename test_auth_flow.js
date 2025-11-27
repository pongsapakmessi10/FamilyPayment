const http = require('http');

const post = (path, data) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/auth' + path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(JSON.stringify(data))
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(data));
        req.end();
    });
};

const run = async () => {
    const timestamp = Date.now();
    const email = `testuser_${timestamp}@example.com`;
    const password = 'password123';
    const familyName = `Family_${timestamp}`;

    console.log(`Testing with email: ${email}`);

    // 1. Register Owner
    console.log('1. Registering Owner...');
    const regRes = await post('/register-owner', {
        username: 'Test User',
        email,
        password,
        familyName
    });
    console.log('Registration Status:', regRes.status);
    console.log('Registration Body:', regRes.body);

    if (regRes.status !== 200) {
        console.error('Registration failed');
        return;
    }

    // 2. Login
    console.log('\n2. Logging in...');
    const loginRes = await post('/login', {
        email,
        password
    });
    console.log('Login Status:', loginRes.status);
    console.log('Login Body:', loginRes.body);

    if (loginRes.status === 200) {
        console.log('\nSUCCESS: Auth flow working correctly.');
    } else {
        console.error('\nFAILURE: Login failed.');
    }
};

run().catch(console.error);
