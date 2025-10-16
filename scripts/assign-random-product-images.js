// Randomly assign images from public/products to products
// For each product, pick 1-3 random images and mark the first as primary

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function getDbPool() {
  const primaryConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'tmdt_user',
    password: process.env.MYSQL_PASSWORD || 'tmdt_password',
    database: process.env.MYSQL_DATABASE || 'easybuy',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  const fallbackConfig = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'easybuy',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };

  // Try primary pool first
  try {
    const pool = mysql.createPool(primaryConfig);
    await pool.execute('SELECT 1');
    return pool;
  } catch (err) {
    console.warn('Primary DB connection failed, trying XAMPP root fallback...');
  }

  // Fallback to XAMPP default root/no password
  const pool = mysql.createPool(fallbackConfig);
  await pool.execute('SELECT 1');
  return pool;
}

function pickRandomImages(files, min = 1, max = 3) {
  if (files.length === 0) return [];
  const count = Math.max(min, Math.min(max, Math.floor(Math.random() * (max - min + 1)) + min));
  const shuffled = [...files].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, files.length));
}

async function main() {
  const imagesDir = path.resolve(__dirname, '..', 'public', 'products');
  if (!fs.existsSync(imagesDir)) {
    console.error('Images directory does not exist:', imagesDir);
    process.exit(1);
  }

  const files = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  if (files.length === 0) {
    console.error('No image files found in', imagesDir);
    process.exit(1);
  }

  const pool = await getDbPool();

  const [products] = await pool.execute('SELECT id, sku, name FROM products WHERE is_active = TRUE');
  console.log(`Assigning images randomly to ${products.length} products from ${files.length} files...`);

  let totalInserted = 0;
  for (const product of products) {
    try {
      // Clear existing images for this product
      await pool.execute('DELETE FROM product_images WHERE product_id = ?', [product.id]);

      const chosen = pickRandomImages(files, 1, 3);
      if (chosen.length === 0) continue;

      let sortOrder = 1;
      for (const [index, filename] of chosen.entries()) {
        const isPrimary = index === 0 ? 1 : 0;
        const imageUrl = `/static/products/${filename}`;
        await pool.execute(
          `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [product.id, imageUrl, product.sku || product.name, isPrimary, sortOrder++]
        );
        totalInserted++;
      }
    } catch (err) {
      console.error(`Failed for product ${product.id}:`, err.message);
    }
  }

  console.log(`Done. Inserted ${totalInserted} image rows.`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


