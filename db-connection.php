<?php
// db-connection.php — Same as db.php (alias for production)
// Import fetenax_schema.sql via phpMyAdmin before using this app

$host   = getenv('DB_HOST') ?: '127.0.0.1';
$port   = getenv('DB_PORT') ?: '3308';
$user   = getenv('DB_USER') ?: 'root';
$pass   = getenv('DB_PASS') ?: '';
$dbname = getenv('DB_NAME') ?: 'fetenax_db';


try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    error_log('FetenaX DB connection failed: ' . $e->getMessage());
    die("Database Connection Failed. Please check server configuration.");
}
// No closing ?> tag
