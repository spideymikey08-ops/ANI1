<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
$name = required($d, 'name');
$crop = required($d, 'crop_type');
$status = required($d, 'status');

if (
    !$id ||
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
        'UPDATE plots
         SET name=?,crop_type=?,status=?
         WHERE id=?'
    );

    $s->execute([
        $name,
        $crop,
        $status,
        $id
    ]);

    json_ok([
        'message' => 'Plot updated.'
    ]);

} catch (PDOException $e) {
    json_error(
        'Unable to update plot.'
    );
}