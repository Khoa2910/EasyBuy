-- Migration script from tmdt_ecommerce to easybuy
-- Run this script to migrate data from old database to new database

-- Step 1: Create new database
CREATE DATABASE IF NOT EXISTS easybuy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Step 2: Copy all tables from old database to new database
-- Note: This will copy all data from tmdt_ecommerce to easybuy

-- First, create all tables in easybuy database
USE easybuy;

-- Copy all tables structure and data
-- You can run the init.sql file to create the structure first
-- Then run the following commands to copy data:

-- Example for users table:
-- INSERT INTO easybuy.users SELECT * FROM tmdt_ecommerce.users;

-- Example for products table:
-- INSERT INTO easybuy.products SELECT * FROM tmdt_ecommerce.products;

-- Note: Run these commands manually for each table you want to migrate
-- Or use mysqldump to export and import:

-- Export from old database:
-- mysqldump -u root -p tmdt_ecommerce > tmdt_backup.sql

-- Import to new database:
-- mysql -u root -p easybuy < tmdt_backup.sql

SELECT 'Migration script ready. Please run the commands manually or use mysqldump.' as message;
