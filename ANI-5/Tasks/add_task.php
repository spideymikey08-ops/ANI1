<?php

require __DIR__ . '/../config.php';

$d = input();

$plot = (int)($d['plot_id'] ?? 0);
$date = required($d, 'task_date');
$taskType = trim((string)($d['task_type'] ?? 'Water'));
$allowedTypes = ['Water', 'Fertilize', 'Weed', 'Pest Control', 'Inspect', 'Other'];

if (!$plot) {
    json_error('Select a plot.');
}

if (!in_array($taskType, $allowedTypes, true)) {
    json_error('Select a valid task type.');
}

$s = $pdo->prepare(
    'INSERT INTO watering_tasks(plot_id, task_date, task_type) VALUES(?, ?, ?)'
);

$s->execute([$plot, $date, $taskType]);

json_ok(['message' => 'Task added.']);
