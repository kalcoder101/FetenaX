-- Migration: create or update a default system administrator account
-- Default login: admin@fetenax.local / Admin123!
-- This script is safe to re-run.

INSERT INTO `users` (`email`, `password`, `role`, `name`, `avatar`, `userId`)
VALUES (
  'admin@fetenax.local',
  '$2y$12$VGt8m3w2mfRlDuypwgi9Qui8/M1Vsfr4fCWWaxxzYFw7T6gZch8YK',
  'system_admin',
  'System Administrator',
  'SA',
  'SYSADMIN001'
)
ON DUPLICATE KEY UPDATE
  `role` = VALUES(`role`),
  `name` = VALUES(`name`),
  `avatar` = VALUES(`avatar`),
  `password` = VALUES(`password`);
