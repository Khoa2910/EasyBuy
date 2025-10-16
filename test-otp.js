const mysql = require('mysql2');

// Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tmdt_ecommerce'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
  
  // Check if otp_verifications table exists
  db.query("SHOW TABLES LIKE 'otp_verifications'", (err, results) => {
    if (err) {
      console.error('❌ Error checking table:', err);
      return;
    }
    
    if (results.length === 0) {
      console.log('❌ Table otp_verifications does not exist. Creating...');
      
      // Create the table
      const createTableSQL = `
        CREATE TABLE otp_verifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          email VARCHAR(255) NOT NULL,
          otp_code VARCHAR(6) NOT NULL,
          type ENUM('registration', 'login', 'password_reset') NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_otp_code (otp_code),
          INDEX idx_type (type),
          INDEX idx_expires_at (expires_at),
          INDEX idx_is_used (is_used)
        )
      `;
      
      db.query(createTableSQL, (err, result) => {
        if (err) {
          console.error('❌ Error creating table:', err);
        } else {
          console.log('✅ Table otp_verifications created successfully');
        }
        db.end();
      });
    } else {
      console.log('✅ Table otp_verifications exists');
      db.end();
    }
  });
});
