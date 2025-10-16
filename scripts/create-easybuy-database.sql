-- Script to create EasyBuy database
-- Run this script to create the new database

-- Create database
CREATE DATABASE IF NOT EXISTS easybuy CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the new database
USE easybuy;

-- Show success message
SELECT 'EasyBuy database created successfully!' as message;
