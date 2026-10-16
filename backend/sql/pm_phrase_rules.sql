USE corob_service;
CREATE TABLE IF NOT EXISTS pm_phrase_rules (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    phrase       VARCHAR(255) NOT NULL UNIQUE,
    label        ENUM('PM Done', 'Dispute') NOT NULL,
    answered_by  VARCHAR(255) NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_phrase_rule_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    rule_id     INT NOT NULL,
    action      ENUM('answered', 'changed', 'removed', 'restored') NOT NULL,
    old_label   ENUM('PM Done', 'Dispute') NULL,
    new_label   ENUM('PM Done', 'Dispute') NULL,
    changed_by  VARCHAR(255) NOT NULL,
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rule (rule_id),
    INDEX idx_user (changed_by),
    FOREIGN KEY (rule_id) REFERENCES pm_phrase_rules(id)
);
