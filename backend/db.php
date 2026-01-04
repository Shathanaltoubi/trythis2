<?php
// db.php - simple PDO connection helper. Edit constants to match your environment.
declare(strict_types=1);
const DB_HOST = '127.0.0.1';
const DB_NAME = 'store_organizer';
const DB_USER = 'root';
const DB_PASS = '';

function getPDO(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
  $opt = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
  ];
  $pdo = new PDO($dsn, DB_USER, DB_PASS, $opt);
  return $pdo;
}
