<?php
// orders.php - handle checkout and listing orders
session_start(); header('Content-Type: application/json; charset=utf-8'); require_once __DIR__.'/db.php';
function jsonErr($m){ echo json_encode(['ok'=>false,'error'=>$m]); exit; }
function jsonOk($d=[]){ echo json_encode(array_merge(['ok'=>true], $d)); exit; }

$action = $_POST['action'] ?? $_GET['action'] ?? '';
try{
  $pdo = getPDO();
  if($action === 'create'){
    if(empty($_POST['items'])) jsonErr('No items');
    $items = json_decode($_POST['items'], true);
    if(!is_array($items) || count($items)===0) jsonErr('Invalid items');
    // validate and reduce stock inside transaction
    $pdo->beginTransaction();
    $subtotal = 0;
    foreach($items as $it){
      $stmt = $pdo->prepare('SELECT id,qty,price FROM products WHERE id=? FOR UPDATE'); $stmt->execute([(int)$it['productId']]); $p = $stmt->fetch();
      if(!$p){ $pdo->rollBack(); jsonErr('Product not found'); }
      if((int)$it['qty'] > (int)$p['qty']){ $pdo->rollBack(); jsonErr('Insufficient stock for ' . $p['id']); }
      $subtotal += ((float)$p['price']) * (int)$it['qty'];
    }
    $tax = (float)($_POST['tax'] ?? 0); $discount = (float)($_POST['discount'] ?? 0);
    $total = max(0, $subtotal + ($subtotal * $tax / 100) - $discount);
    $stmt = $pdo->prepare('INSERT INTO orders (user_id, items_json, subtotal, tax_percent, discount, total, payment_method, paid_amount, change_amount) VALUES (?,?,?,?,?,?,?,?,?)');
    $stmt->execute([ $_SESSION['user_id'] ?? null, json_encode($items, JSON_UNESCAPED_UNICODE), $subtotal, $tax, $discount, $total, $_POST['payment'] ?? null, (float)($_POST['paid'] ?? 0), max(0, (float)($_POST['paid'] ?? 0) - $total) ]);
    $orderId = $pdo->lastInsertId();
    // deduct stock and add movements
    foreach($items as $it){
      $pdo->prepare('UPDATE products SET qty = qty - ? WHERE id = ?')->execute([(int)$it['qty'], (int)$it['productId']]);
      $pdo->prepare('INSERT INTO movements (product_id,`type`,qty,note,user_id) VALUES (?,?,?,?,?)')
          ->execute([(int)$it['productId'], 'out', (int)$it['qty'], 'Sale order:'.$orderId, $_SESSION['user_id'] ?? null]);
    }
    $pdo->commit();
    jsonOk(['orderId'=>$orderId]);
  }

  if($action === 'list'){
    // admin can see all; users see own
    if(isset($_SESSION['role']) && $_SESSION['role']==='admin'){
      $stmt = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500'); $rows = $stmt->fetchAll(); jsonOk(['orders'=>$rows]);
    } else {
      $uid = $_SESSION['user_id'] ?? 0; $stmt = $pdo->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 200'); $stmt->execute([$uid]); jsonOk(['orders'=>$stmt->fetchAll()]);
    }
  }

  jsonErr('No action');
}catch(Exception $e){ if($pdo && $pdo->inTransaction()) $pdo->rollBack(); jsonErr('Server error: '.$e->getMessage()); }
