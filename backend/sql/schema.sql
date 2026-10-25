
CREATE DATABASE IF NOT EXISTS corob_service
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE corob_service;

CREATE TABLE companies (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255) NOT NULL UNIQUE,
    email_domain  VARCHAR(255) NOT NULL UNIQUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE users (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           ENUM('customer', 'corob_employee') NOT NULL,
    company_id     INT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
);

CREATE TABLE service_call_sessions (
    session_id   CHAR(36) PRIMARY KEY,
    owner_sub    VARCHAR(64) NOT NULL DEFAULT '',
    payload      LONGBLOB NOT NULL,
    expires_at   DATETIME NOT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_expires (expires_at)
);

CREATE TABLE pm_data (
    company_slug VARCHAR(255) PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    payload      LONGBLOB NOT NULL,
    expires_at   DATETIME NOT NULL,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_expires (expires_at)
);

CREATE TABLE login_attempts (
    device_ip_key VARCHAR(255) PRIMARY KEY,
    attempts      INT NOT NULL DEFAULT 0,
    window_expires_at   DATETIME NULL,
    locked_until        DATETIME NULL
);

INSERT INTO companies (name, email_domain) VALUES
    ('AKZO Nobel Paints', 'akzonobel.com'),
    ('Asian Paints Ltd', 'asianpaints.com'),
    ('Birla Opus Paints', 'birlaopus.com');
