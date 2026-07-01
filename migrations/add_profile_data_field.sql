-- Migration: Add profile_data JSON field to store bio, preferences, etc.
-- Date: 2025-07-01

ALTER TABLE `users` 
ADD COLUMN `profile_data` JSON DEFAULT NULL AFTER `avatar`;

-- profile_data structure (stored as JSON):
-- {
--   "bio": "User bio/about section",
--   "theme": "dark|light|auto",
--   "language": "en|am|etc",
--   "notifications_enabled": true,
--   "last_profile_update": "2025-07-01T15:30:00Z"
-- }

-- Add an index for faster queries
ALTER TABLE `users` ADD FULLTEXT INDEX ft_profile_data (`profile_data`);
