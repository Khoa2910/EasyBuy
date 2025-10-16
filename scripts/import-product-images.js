// Import product images from public/products into MySQL product_images table
// Filename conventions supported:
//  - <SKU>.jpg (primary image)
//  - <SKU>_1.jpg, <SKU>_2.jpg ... (ordered images, _1 is primary if no plain SKU.jpg)
//  - <SKU>-primary.jpg (explicit primary)

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function getDbPool() {
  const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'tmdt_user',
    password: process.env.MYSQL_PASSWORD || 'tmdt_password',
    database: process.env.MYSQL_DATABASE || 'easybuy',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });
  return pool;
}

function parseSkuFromFilename(filename) {
  const base = filename.toLowerCase();
  const noExt = base.replace(path.extname(base), '');
  // accept patterns: sku, sku_1, sku-1, sku-primary
  const primary = /^(.*?)-(primary)$/i.exec(noExt);
  if (primary) return { sku: primary[1], sort: 0, isPrimary: true };
  const indexed = /^(.*?)[_-](\d{1,2})$/i.exec(noExt);
  if (indexed) return { sku: indexed[1], sort: parseInt(indexed[2], 10), isPrimary: indexed[2] === '1' };
  return { sku: noExt, sort: 0, isPrimary: true };
}

async function main() {
  const imagesDir = path.resolve(__dirname, '..', 'public', 'products');
  if (!fs.existsSync(imagesDir)) {
    console.error('Images directory does not exist:', imagesDir);
    process.exit(1);
  }

  const pool = await getDbPool();
  const files = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  if (files.length === 0) {
    console.log('No images found in', imagesDir);
    process.exit(0);
  }

  let processed = 0;
  let skipped = 0;
  for (const file of files) {
    const { sku, sort, isPrimary } = parseSkuFromFilename(file);
    const relUrl = `/static/products/${file}`;

    try {
      const [products] = await pool.execute('SELECT id FROM products WHERE sku = ? LIMIT 1', [sku.toUpperCase()]);
      const product = products[0] || (await pool.execute('SELECT id FROM products WHERE LOWER(sku) = ? LIMIT 1', [sku]))[0]?.[0];

      if (!product) {
        skipped++;
        console.warn(`SKU not found for file ${file} -> parsed sku="${sku}"`);
        continue;
      }

      // If marking primary, unset other primaries
      if (isPrimary) {
        await pool.execute('UPDATE product_images SET is_primary = FALSE WHERE product_id = ?', [product.id]);
      }

      await pool.execute(
        `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [product.id, relUrl, sku.toUpperCase(), isPrimary ? 1 : 0, sort]
      );

      processed++;
    } catch (err) {
      console.error('Failed to import', file, err.message);
      skipped++;
    }
  }

  console.log(`Done. Imported: ${processed}, Skipped: ${skipped}`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


