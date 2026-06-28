<?php
// db-connection.php — Same as db.php (alias for production)
// Import fetenax_schema.sql via phpMyAdmin before using this app

$host   = getenv('DB_HOST') ?: 'sql208.infinityfree.com';
$port   = getenv('DB_PORT') ?: '3306';
$user   = getenv('DB_USER') ?: 'if0_42279707';
$pass   = getenv('DB_PASS') ?: 'nu2jDmHJhjhk';
$dbname = getenv('DB_NAME') ?: 'if0_42279707_fetenax_db';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    die("Database Connection Failed: " . $e->getMessage());
}
// No closing ?> tag
