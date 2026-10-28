-- Migration: add 'admin' to the users role ENUM
-- Run once on the Ubuntu MySQL server.
-- Safe to re-run: ALTER COLUMN on an ENUM is idempotent if the value already exists.

ALTER TABLE users
  MODIFY COLUMN role ENUM('customer', 'corob_employee', 'admin') NOT NULL;

-- To create an admin user (replace values as needed):
--   INSERT INTO users (email, password_hash, role, company_id, is_active)
--   VALUES ('admin@corob.com', '<bcrypt_hash>', 'admin', NULL, 1);
--
-- Generate bcrypt hash in Python:
--   python3 -c "import bcrypt; print(bcrypt.hashpw(b'your-password', bcrypt.gensalt()).decode())"

