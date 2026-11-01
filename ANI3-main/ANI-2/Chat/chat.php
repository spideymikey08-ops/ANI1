<?php
// Aniya chatbot endpoint.
// Uses the Claude API if ANTHROPIC_API_KEY is set in config.php,
// otherwise falls back to simple built-in answers from your database.
require __DIR__ . '/../config.php';

$data    = input();
$message = trim((string)($data['message'] ?? ''));
$history = is_array($data['history'] ?? null) ? $data['history'] : [];
if ($message === '') json_error('Please type a message.');
if (mb_strlen($message) > 500) json_error('Message is too long (max 500 characters).');

// ---------- Farm snapshot (read from the database) ----------
$today = date('Y-m-d');

$plots = $pdo->query(
    "SELECT p.name, p.status, pl.crop_name, pl.variety, pl.planted_date, pl.expected_harvest_date
     FROM plots p
     LEFT JOIN plantings pl ON pl.id=(SELECT MAX(id) FROM plantings WHERE plot_id=p.id)
     ORDER BY p.id"
)->fetchAll();

$s = $pdo->prepare(
    "SELECT p.name plot_name, w.task_date, w.done
     FROM watering_tasks w JOIN plots p ON p.id=w.plot_id
     WHERE w.task_date BETWEEN ? AND DATE_ADD(?, INTERVAL 7 DAY)
     ORDER BY w.task_date"
);
$s->execute([$today, $today]);
$tasks = $s->fetchAll();

$harvests = $pdo->query(
    "SELECT p.name plot_name, h.harvest_date, h.quantity
     FROM harvests h JOIN plots p ON p.id=h.plot_id
     ORDER BY h.harvest_date DESC, h.id DESC LIMIT 5"
)->fetchAll();

$seeds = $pdo->query("SELECT seed_name, quantity_g, threshold_g FROM seeds ORDER BY id")->fetchAll();

$fin = $pdo->query(
    "SELECT
        COALESCE(SUM(CASE WHEN transaction_type='Income'  THEN amount END),0) income,
        COALESCE(SUM(CASE WHEN transaction_type='Expense' THEN amount END),0) expenses
     FROM finance_transactions"
)->fetch();

// ---------- Mode 1: Claude API ----------
if (defined('ANTHROPIC_API_KEY') && ANTHROPIC_API_KEY !== '') {
    $snapshot = json_encode([
        'today'            => $today,
        'plots'            => $plots,
        'watering_tasks_next_7_days' => $tasks,
        'recent_harvests_kg_or_units' => $harvests,
        'seeds'            => $seeds,
        'finance_totals'   => $fin,
    ], JSON_UNESCAPED_UNICODE);

    $system =
        "You are Ani, the friendly assistant inside Ani, a rice farm / plot tracking web app. " .
        "Help the user with rice farming questions and with understanding their own farm data. " .
        "Answer using the farm data below when the question is about their plots, tasks, harvests, seeds or finances; " .
        "if the data doesn't contain the answer, say so instead of guessing. " .
        "You can only read data, you cannot add or change records - tell the user which page to use (Plots, Tasks, Seed & Harvest, Farm Finance, Calendar). " .
        "Keep answers short, plain and practical (under about 120 words) and don't use markdown headings.\n\n" .
        "FARM DATA (JSON):\n" . $snapshot;

    // keep only the last 10 valid turns from the browser
    $msgs = [];
    foreach (array_slice($history, -10) as $h) {
        $role = $h['role'] ?? '';
        $text = trim((string)($h['content'] ?? ''));
        if (($role === 'user' || $role === 'assistant') && $text !== '') {
            $msgs[] = ['role' => $role, 'content' => mb_substr($text, 0, 1000)];
        }
    }
    // API needs the first message to be from the user and roles to alternate
    while ($msgs && $msgs[0]['role'] !== 'user') array_shift($msgs);
    $clean = [];
    foreach ($msgs as $m) {
        if ($clean && end($clean)['role'] === $m['role']) array_pop($clean);
        $clean[] = $m;
    }
    if ($clean && end($clean)['role'] === 'user') array_pop($clean);
    $clean[] = ['role' => 'user', 'content' => $message];

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-api-key: ' . ANTHROPIC_API_KEY,
            'anthropic-version: 2023-06-01',
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model'      => (defined('ANTHROPIC_MODEL') && ANTHROPIC_MODEL !== '') ? ANTHROPIC_MODEL : 'claude-3-5-haiku-20241022',
            'max_tokens' => 400,
            'system'     => $system,
            'messages'   => $clean,
        ]),
    ]);
    $raw  = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($raw === false) json_error('Could not reach the AI service: ' . $err, 502);
    $res = json_decode($raw, true);
    if ($code !== 200 || empty($res['content'][0]['text'])) {
        $detail = $res['error']['message'] ?? 'Unexpected response';
        json_error('AI service error: ' . $detail, 502);
    }
    json_ok(['reply' => trim($res['content'][0]['text']), 'mode' => 'ai']);
}

// ---------- Mode 2: built-in answers (no API key needed) ----------
$q = mb_strtolower($message);
$has = fn(array $words) => (bool)array_filter($words, fn($w) => str_contains($q, $w));
$fmt = fn($d) => $d ? date('M j, Y', strtotime($d)) : 'not set';

if (preg_match('/\b(hello|hi|hey|help)\b/u', $q)) {
    $reply = "Hi! I'm Ani 🌾 Ask me about your plots, today's tasks, recent harvests, seed stock, or your farm finances.";
} elseif ($has(['task'])) {
    $todayTasks = array_filter($tasks, fn($t) => $t['task_date'] === $today && !$t['done']);
    $reply = $todayTasks
        ? "You have " . count($todayTasks) . " task(s) left today: " .
          implode('
', array_column($todayTasks, 'plot_name'))
        : "No pending tasks for today. 🎉";
} elseif ($has(['harvest'])) {
    if ($has(['expected', 'next', 'when', 'upcoming'])) {
        $up = array_filter($plots, fn($p) => $p['expected_harvest_date'] && $p['expected_harvest_date'] >= $today);
        usort($up, fn($a, $b) => strcmp($a['expected_harvest_date'], $b['expected_harvest_date']));
        $reply = $up
            ? "Next expected harvest:
" . $up[0]['name'] . " on " . $fmt($up[0]['expected_harvest_date']) . "."
            : "No upcoming expected harvest dates are set yet.";
    } else {
        $reply = $harvests
            ? "Latest harvest:
" . $harvests[0]['plot_name'] . " — " . (float)$harvests[0]['quantity'] .
              " on " . $fmt($harvests[0]['harvest_date']) . "."
            : "No harvest records yet.";
    }
} elseif ($has(['seed', 'stock', 'inventory'])) {
    $low = array_filter($seeds, fn($x) => (float)$x['quantity_g'] <= (float)$x['threshold_g']);
    $reply = $seeds
        ? count($seeds) . " seed record(s).
" .
          ($low ? "Low stock: " . implode(', ', array_column($low, 'seed_name')) . "." : "None are low on stock.")
        : "No seed records yet.";
} elseif ($has(['profit', 'income', 'expense', 'money', 'finance', 'revenue'])) {
    $net = (float)$fin['income'] - (float)$fin['expenses'];
    $reply = sprintf("Income: ₱%s
Expenses: ₱%s
Net: %s₱%s.",
        number_format($fin['income'], 2), number_format($fin['expenses'], 2),
        $net < 0 ? '-' : '', number_format(abs($net), 2));
} elseif ($has(['plot', 'field', 'available', 'occupied'])) {
    $reply = $plots
        ? count($plots) . " plot(s):
" . implode('
', array_map(
            fn($p) => $p['name'] . ' (' . $p['status'] . ($p['crop_name'] ? ', ' . $p['crop_name'] : '') . ')', $plots))
        : "No plots yet. Add one in the Plots page.";
} else {
    $reply = "I can answer about plots, tasks, harvests, seeds, or finances. Try: “What tasks do I have today?”";
}

json_ok(['reply' => $reply, 'mode' => 'basic']);
