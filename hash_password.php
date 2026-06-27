<?php
/**
 * hash_password.php – Bcrypt Password Hash Generator for FetenaX
 *
 * Usage:
 *   php hash_password.php                   # hash the default 'password123'
 *   php hash_password.php "myPassword"      # hash a custom password
 *   php hash_password.php --update-seed     # update fetenax_full.sql with fresh hashes
 *
 * The generated hash can be used directly in UPDATE/INSERT statements or
 * placed into fetenax_full.sql seed data.
 */

$password = isset($argv[1]) ? $argv[1] : 'password123';

if ($password === '--update-seed') {
    updateSeedFile();
    exit(0);
}

$hash = password_hash($password, PASSWORD_BCRYPT);

echo PHP_EOL;
echo "  Password : {$password}" . PHP_EOL;
echo "  Hash     : {$hash}" . PHP_EOL;
echo "  Verify   : " . (password_verify($password, $hash) ? '✅ OK' : '❌ FAIL') . PHP_EOL;
echo PHP_EOL;

/**
 * Regenerate all bcrypt hashes in the seed SQL file.
 * Finds placeholder comment blocks and replaces the hash values.
 */
function updateSeedFile(): void {
    $seedFile = __DIR__ . '/fetenax_full.sql';

    if (!file_exists($seedFile)) {
        echo "❌  fetenax_full.sql not found in " . __DIR__ . PHP_EOL;
        exit(1);
    }

    $sql = file_get_contents($seedFile);

    // Define known passwords and their placeholder markers
    $passwords = [
        'password123' => '$2y$12$vsicdcUBbdiuXnQNVPEiueQYgmuvhqYajZtyNC.vxLPT6iEUe5YVC',
        '123456'      => '$2y$12$26qqT3Y0fENs9wjKJI7FqO.t5X8ZvgQoTUS3IMcmSiRI1iTGw.CTG',
    ];

    foreach ($passwords as $pwd => $oldHash) {
        $newHash = password_hash($pwd, PASSWORD_BCRYPT);
        $sql = str_replace($oldHash, $newHash, $sql);
        echo "  {$pwd}: {$newHash}" . PHP_EOL;
    }

    // Update the comment banner with the new hashes
    $commentLines = [];
    foreach ($passwords as $pwd => $_old) {
        // Find the new hash that was substituted
        preg_match("/\\\$2y\\\$[^'\"]+/", $sql, $matches);
        // This is a simplified approach — regenerate inline
        $hash = password_hash($pwd, PASSWORD_BCRYPT);
        $commentLines[] = " * {$pwd}  → {$hash}";
    }
    $commentBlock = " -- Passwords are bcrypt hashes. Use hash_password.php to generate new ones.\n" .
                    implode("\n", array_map(function($l) { return "-- " . $l; }, $commentLines));

    file_put_contents($seedFile, $sql);
    echo PHP_EOL . "✅  {$seedFile} updated with fresh hashes." . PHP_EOL;
}
