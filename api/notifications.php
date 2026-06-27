<?php
// api/notifications.php - Notification actions for FetenaX
// Included by api.php. Variables: $pdo, $requestData, $action, $currentUser, respond()

if ($action === 'get_notifications') {
    $stmt = $pdo->prepare("SELECT `id`, `type`, `title`, `message`, `link`, `isRead`, `createdAt` FROM `notifications` WHERE `userId` = ? ORDER BY `createdAt` DESC LIMIT 50");
    $stmt->execute([$currentUser['id']]);
    $notifications = $stmt->fetchAll();

    $stmt2 = $pdo->prepare("SELECT COUNT(*) FROM `notifications` WHERE `userId` = ? AND `isRead` = 0");
    $stmt2->execute([$currentUser['id']]);
    $unreadCount = (int)$stmt2->fetchColumn();

    respond('success', ['notifications' => $notifications, 'unreadCount' => $unreadCount]);
}

if ($action === 'mark_notification_read') {
    $notifId = isset($requestData['notifId']) ? (int)$requestData['notifId'] : 0;
    if ($notifId <= 0) respond('error', ['message' => 'Invalid notification ID.']);
    $pdo->prepare("UPDATE `notifications` SET `isRead` = 1 WHERE `id` = ? AND `userId` = ?")
        ->execute([$notifId, $currentUser['id']]);
    respond('success');
}

if ($action === 'mark_all_notifications_read') {
    $pdo->prepare("UPDATE `notifications` SET `isRead` = 1 WHERE `userId` = ?")
        ->execute([$currentUser['id']]);
    respond('success');
}
