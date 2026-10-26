USE corob_service;
CREATE TABLE audit_log (
    id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actor   VARCHAR(255) NOT NULL,
    action  VARCHAR(64) NOT NULL,
    detail  VARCHAR(500) NOT NULL DEFAULT '',
    INDEX idx_at (at)
);