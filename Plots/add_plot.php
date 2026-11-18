<?php

require __DIR__ . '/../config.php';

$d = input();

$name = required($d, 'name');
$status = $d['status'] ?? 'Available';

if (!in_array($status, ['Available', 'Planted', 'Maintenance'], true)) {
    json_error('Invalid plot data.');
}

try {
    $s = $pdo->prepare(
        'INSERT INTO plots(user_id,name,status)
         VALUES(?,?,?)'
    );

    $s->execute([
        uid(),
        $name,
        $status
    ]);

    json_ok([
        'id' => $pdo->lastInsertId(),
        'message' => 'Plot added.'
    ]);

} catch (PDOException $e) {
    json_error(
        $e->getCode() === '23000'
            ? 'Plot name already exists.'
            : 'Unable to add plot.',
        400
    );
}