<?php

require __DIR__ . '/../config.php';

$d = input();

$id = (int)($d['id'] ?? 0);
$name = required($d, 'name');
$crop = required($d, 'crop_type');
$status = required($d, 'status');

if ($status === 'Occupied') $status = 'Planted';
if (
    !$id ||
    $crop !== 'Rice' ||
    !in_array(
        $status,
        ['Available', 'Planted', 'Occupied', 'Maintenance'],
        true
    )
) {
    json_error('Invalid plot data.');
}

if (!own_plot($pdo, $id)) {
    json_error('Plot not found.', 404);
}

try {
    $s = $pdo->prepare(
        'UPDATE plots
         SET name=?,crop_type=?,status=?
         WHERE id=? AND user_id <=> COALESCE(?, user_id)'
    );

    $s->execute([
        $name,
        $crop,
        $status,
        $id,
        sid()
    ]);

    json_ok([
        'message' => 'Plot updated.'
    ]);

} catch (PDOException $e) {
    json_error(
        $e->getCode() === '23000'
            ? 'Plot name already exists.'
            : 'Unable to update plot.'
    );
}