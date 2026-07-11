const http = require('http');

const data = JSON.stringify({ email: 'demo@pulsequeue.dev', password: 'demo1234' });
const options = {
  hostname: 'localhost',
  port: 8001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', JSON.stringify(res.headers, null, 2));
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('BODY', body);
  });
});
req.on('error', (e) => { console.error('ERR', e.message); });
req.write(data);
req.end();
