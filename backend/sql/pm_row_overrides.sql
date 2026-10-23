USE corob_service;
CREATE TABLE IF NOT EXISTS pm_row_overrides (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    company     VARCHAR(255) NOT NULL,
    ticket_no   VARCHAR(190) NOT NULL,
    label       ENUM('PM Done', 'Dispute') NOT NULL,
    set_by      VARCHAR(255) NOT NULL,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_ticket (company, ticket_no)
);
