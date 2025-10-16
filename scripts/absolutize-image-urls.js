// Update product_images.image_url to absolute URLs: http://localhost:3000/static/...
const mysql = require('mysql2/promise');
require('dotenv').config();

async function getPool() {
  const primary = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'tmdt_user',
    password: process.env.MYSQL_PASSWORD || 'tmdt_password',
    database: process.env.MYSQL_DATABASE || 'easybuy',
    waitForConnections: true,
    connectionLimit: 10
  };
  const fallback = { host: 'localhost', port: 3306, user: 'root', password: '', database: 'easybuy' };
  try {
    const pool = mysql.createPool(primary);
    await pool.execute('SELECT 1');
    return pool;
  } catch (_) {
    const pool = mysql.createPool(fallback);
    await pool.execute('SELECT 1');
    return pool;
  }
}

async function main() {
  const pool = await getPool();
  const baseGateway = 'http://localhost:3000';
  const baseApache = 'http://localhost/EasyBuy/public';

  const mode = (process.argv[2] || 'gateway').toLowerCase();
  if (mode !== 'gateway' && mode !== 'apache') {
    console.log('Usage: node scripts/absolutize-image-urls.js [gateway|apache]');
    process.exit(1);
  }

  if (mode === 'gateway') {
    const [res1] = await pool.execute(
      "UPDATE product_images SET image_url = CONCAT(?, image_url) WHERE image_url LIKE '/static/%'",
      [baseGateway]
    );
    console.log(`Updated ${res1.affectedRows} rows to absolute Gateway URLs.`);
  } else {
    const [res2] = await pool.execute(
      "UPDATE product_images SET image_url = REPLACE(image_url, 'http://localhost:3000/static', ?) WHERE image_url LIKE 'http://localhost:3000/static/%'",
      [baseApache]
    );
    console.log(`Updated ${res2.affectedRows} rows to absolute Apache URLs.`);
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });


