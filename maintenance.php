<?php
// maintenance.php — Zero-downtime deployment helper
// Usage:
//   Enable:  php maintenance.php on
//   Disable: php maintenance.php off
//   Status:  php maintenance.php status
//
// When maintenance mode is on, index.php and api.php return 503 Service Unavailable.

$root = __DIR__;
$flagFile = $root . '/.maintenance';

$cmd = isset($argv[1]) ? $argv[1] : 'status';

if ($cmd === 'on') {
    file_put_contents($flagFile, json_encode([
        'enabled' => true,
        'time' => date('Y-m-d H:i:s'),
        'message' => 'FetenaX is under maintenance. Please check back in a few minutes.'
    ]));
    echo "Maintenance mode ENABLED.\n";
} elseif ($cmd === 'off') {
    if (file_exists($flagFile)) unlink($flagFile);
    echo "Maintenance mode DISABLED.\n";
} else {
    if (file_exists($flagFile)) {
        $data = json_decode(file_get_contents($flagFile), true);
        echo "Maintenance mode: ENABLED (since " . ($data['time'] ?? 'unknown') . ")\n";
    } else {
        echo "Maintenance mode: DISABLED\n";
    }
}
