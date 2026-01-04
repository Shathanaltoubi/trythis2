<?php
// movements.php - record/list stock movements
session_start(); header('Content-Type: application/json; charset=utf-8'); require_once __DIR__.'/db.php';
function jsonErr($m){ echo json_encode(['ok'=>false,'error'=>$m]); exit; }
function jsonOk($d=[]){ echo json_encode(array_merge(['ok'=>true], $d)); exit; }

$action = $_POST['action'] ?? $_GET['action'] ?? '';
try{
  $pdo = getPDO();
  if($action === 'list'){
    $stmt = $pdo->query('SELECT m.*, p.name AS product_name FROM movements m LEFT JOIN products p ON p.id = m.product_id ORDER BY m.created_at DESC LIMIT 500');
    $rows = $stmt->fetchAll(); jsonOk(['movements'=>$rows]);
  }

  if($action === 'add'){
    // allow cashier/admin
    if(!isset($_SESSION['role']) || !in_array($_SESSION['role'], ['admin','cashier'])) jsonErr('Forbidden');
    $pid = (int)($_POST['product_id'] ?? 0); $type = $_POST['type'] ?? ''; $qty = (int)($_POST['qty'] ?? 0);
    if(!$pid || !$qty || !in_array($type,['in','out'])) jsonErr('Invalid');
    // check stock for out
    $stmt = $pdo->prepare('SELECT qty FROM products WHERE id=?'); $stmt->execute([$pid]); $p = $stmt->fetch(); if(!$p) jsonErr('Product not found');
    if($type==='out' && $p['qty'] < $qty) jsonErr('Insufficient stock');
    $stmt = $pdo->prepare('INSERT INTO movements (product_id,`type`,qty,note,user_id) VALUES (?,?,?, ?, ?)'); $stmt->execute([$pid,$type,$qty,$_POST['note'] ?? null,$_SESSION['user_id'] ?? null]);
    // update product qty
    if($type==='in') $pdo->prepare('UPDATE products SET qty = qty + ? WHERE id=?')->execute([$qty,$pid]); else $pdo->prepare('UPDATE products SET qty = qty - ? WHERE id=?')->execute([$qty,$pid]);
    jsonOk();
  }

  jsonErr('No action');
}catch(Exception $e){ jsonErr('Server error: '.$e->getMessage()); }
