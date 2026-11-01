<?php

require __DIR__ . '/../config.php';

$d = input();

$plot = (int)($d['plot_id'] ?? 0);
$planting_id = (int)($d['planting_id'] ?? 0);
$crop = 'Rice';
$variety = trim((string)($d['variety'] ?? ''));
$planted = required($d, 'planted_date');
$expected = trim((string)($d['expected_harvest_date'] ?? ''));
$notes = trim((string)($d['notes'] ?? ''));

if (!$plot) {
    json_error('Select a plot.');
}

$check = $pdo->prepare(
    "SELECT COUNT(*) FROM plots
     WHERE id=? AND crop_type='Rice'"
);

$check->execute([
    $plot
]);

if (!(int)$check->fetchColumn()) {
    json_error('Invalid rice plot.');
}

$pdo->beginTransaction();

try {
    if ($planting_id) {
        $s = $pdo->prepare(
            'UPDATE plantings
             SET crop_name=?,
                 variety=?,
                 planted_date=?,
                 expected_harvest_date=?,
                 notes=?
             WHERE id=? AND plot_id=?'
        );

        $s->execute([
            $crop,
            $variety ?: null,
            $planted,
            $expected ?: null,
            $notes ?: null,
            $planting_id,
            $plot
        ]);

        if ($s->rowCount() === 0) {
            $pdo->rollBack();
            json_error('Planting record not found.');
        }

        $message = 'Planting updated.';

    } else {
        $s = $pdo->prepare(
            'INSERT INTO plantings(
                plot_id,
                crop_name,
                variety,
                planted_date,
                expected_harvest_date,
                notes
            )
            VALUES(?,?,?,?,?,?)'
        );

        $s->execute([
            $plot,
            $crop,
            $variety ?: null,
            $planted,
            $expected ?: null,
            $notes ?: null
        ]);

        $message = 'Planting added.';
    }

    $pdo
        ->prepare(
            "UPDATE plots
             SET status='Occupied'
             WHERE id=?"
        )
        ->execute([$plot]);

    $pdo->commit();

    json_ok([
        'message' => $message
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    json_error(
        'Unable to add planting.'
    );
}