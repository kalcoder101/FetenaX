<?php
// db.php - Database connection for FetenaX
// IMPORTANT: Import fetenax_schema.sql via phpMyAdmin BEFORE using this app

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
    // Output JSON error so the frontend can handle it properly
    if (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false) {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode(['status' => 'error', 'message' => 'Database connection failed. Please import fetenax_schema.sql via phpMyAdmin. Error: ' . $e->getMessage()]);
    } else {
        die("Database Connection Failed: " . $e->getMessage() . "<br><br>Please make sure you have imported <code>fetenax_schema.sql</code> via phpMyAdmin.");
    }
    exit;
}
