<?php

require __DIR__ . '/../config.php';

$d = input();

$name = required($d, 'name');
$crop = required($d, 'crop_type');
$status = $d['status'] ?? 'Available';

if (
    $crop !== 'Rice' ||
    !in_array(
        $status,
        ['Available', 'Occupied', 'Maintenance'],
        true
    )
) {
    json_error('Invalid plot data.');
}

try {
    $s = $pdo->prepare(
        'INSERT INTO plots(name,crop_type,status)
         VALUES(?,?,?)'
    );

    $s->execute([
        $name,
        $crop,
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