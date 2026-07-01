<?php
// api/groups.php - Class Groups actions for FetenaX
// Included by api.php. Variables: $pdo, $requestData, $action, $currentUser, respond()

if (!in_array($currentUser['role'], ['teacher', 'system_admin'], true)) {
    respond('error', ['message' => 'Forbidden.']);
}

if ($action === 'teacher_create_group') {
    $name = isset($requestData['name']) ? trim($requestData['name']) : '';
    if (empty($name)) respond('error', ['message' => 'Group name is required.']);
    $stmt = $pdo->prepare("INSERT INTO `groups` (`teacherId`,`name`) VALUES (?,?)");
    $stmt->execute([$currentUser['id'], $name]);
    respond('success', ['id' => (int)$pdo->lastInsertId(), 'message' => "Group \"$name\" created."]);
}

if ($action === 'teacher_list_groups') {
    $stmt = $pdo->prepare("SELECT g.*, COUNT(gm.studentId) as memberCount
        FROM `groups` g LEFT JOIN `group_members` gm ON g.id = gm.groupId
        WHERE g.teacherId = ? GROUP BY g.id ORDER BY g.name ASC");
    $stmt->execute([$currentUser['id']]);
    $groups = $stmt->fetchAll();

    $students = $pdo->prepare("SELECT id, name, userId, email FROM `users` WHERE `role`='student' ORDER BY name ASC");
    $students->execute();
    $allStudents = $students->fetchAll();

    foreach ($groups as &$g) {
        $m = $pdo->prepare("SELECT u.id, u.name, u.userId FROM `group_members` gm JOIN `users` u ON gm.studentId = u.id WHERE gm.groupId = ?");
        $m->execute([$g['id']]);
        $g['members'] = $m->fetchAll();
        $ea = $pdo->prepare("SELECT e.id, e.title FROM `exam_groups` eg JOIN `exams` e ON eg.examId = e.id WHERE eg.groupId = ?");
        $ea->execute([$g['id']]);
        $g['exams'] = $ea->fetchAll();
    }
    unset($g);

    respond('success', ['groups' => $groups, 'allStudents' => $allStudents]);
}

if ($action === 'teacher_delete_group') {
    $groupId = isset($requestData['groupId']) ? (int)$requestData['groupId'] : 0;
    if ($groupId <= 0) respond('error', ['message' => 'Invalid group ID.']);
    $pdo->prepare("DELETE FROM `groups` WHERE `id`=? AND `teacherId`=?")->execute([$groupId, $currentUser['id']]);
    respond('success', ['message' => 'Group deleted.']);
}

if ($action === 'teacher_group_member') {
    $groupId   = isset($requestData['groupId'])   ? (int)$requestData['groupId']   : 0;
    $studentId = isset($requestData['studentId']) ? (int)$requestData['studentId'] : 0;
    $addOrRemove = isset($requestData['action2']) ? $requestData['action2'] : 'add';

    if ($groupId <= 0 || $studentId <= 0) respond('error', ['message' => 'Invalid IDs.']);

    $chk = $pdo->prepare("SELECT id FROM `groups` WHERE `id`=? AND `teacherId`=?");
    $chk->execute([$groupId, $currentUser['id']]);
    if (!$chk->fetch()) respond('error', ['message' => 'Unauthorized.']);

    if ($addOrRemove === 'remove') {
        $pdo->prepare("DELETE FROM `group_members` WHERE `groupId`=? AND `studentId`=?")->execute([$groupId, $studentId]);
        respond('success', ['message' => 'Student removed from group.']);
    } else {
        $pdo->prepare("INSERT IGNORE INTO `group_members` (`groupId`,`studentId`) VALUES (?,?)")->execute([$groupId, $studentId]);
        respond('success', ['message' => 'Student added to group.']);
    }
}

if ($action === 'teacher_assign_exam_group') {
    $examId  = isset($requestData['examId'])  ? (int)$requestData['examId']  : 0;
    $groupId = isset($requestData['groupId']) ? (int)$requestData['groupId'] : 0;
    $assign  = isset($requestData['assign'])  ? (bool)$requestData['assign'] : true;

    if ($examId <= 0 || $groupId <= 0) respond('error', ['message' => 'Invalid IDs.']);

    if ($assign) {
        $pdo->prepare("INSERT IGNORE INTO `exam_groups` (`examId`,`groupId`) VALUES (?,?)")->execute([$examId, $groupId]);
        respond('success', ['message' => 'Exam assigned to group.']);
    } else {
        $pdo->prepare("DELETE FROM `exam_groups` WHERE `examId`=? AND `groupId`=?")->execute([$examId, $groupId]);
        respond('success', ['message' => 'Exam unassigned from group.']);
    }
}

// Fallback: no action matched in this file
respond('error', ['message' => 'Action not found: ' . $action]);
