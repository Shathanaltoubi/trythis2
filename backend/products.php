<?php
// products.php - CRUD for products. Supports file upload for images.
session_start(); header('Content-Type: application/json; charset=utf-8'); require_once __DIR__.'/db.php';

function jsonErr($m){ echo json_encode(['ok'=>false,'error'=>$m]); exit; }
function jsonOk($d=[]){ echo json_encode(array_merge(['ok'=>true], $d)); exit; }

// simple auth helper
function requireAdmin(){ if(!isset($_SESSION['role']) || $_SESSION['role']!=='admin') { http_response_code(403); jsonErr('Forbidden'); } }

$action = $_POST['action'] ?? $_GET['action'] ?? '';
try{
  $pdo = getPDO();
  if($action === 'list'){
    $stmt = $pdo->query('SELECT * FROM products ORDER BY id DESC'); $rows = $stmt->fetchAll(); jsonOk(['products'=>$rows]);
  }

  if($action === 'get'){
    $id = (int)($_GET['id'] ?? 0); if(!$id) jsonErr('Missing id');
    $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?'); $stmt->execute([$id]); $p = $stmt->fetch(); jsonOk(['product'=>$p]);
  }

  if($action === 'create'){
    requireAdmin();
    $name = trim($_POST['name'] ?? ''); if(!$name) jsonErr('Name required');
    $sku = $_POST['sku'] ?? null; $category = $_POST['category'] ?? null; $supplier = $_POST['supplier'] ?? null;
    $qty = (int)($_POST['qty'] ?? 0); $reorder = $_POST['reorder']!==''? (int)$_POST['reorder'] : null; $price = (float)($_POST['price'] ?? 0);
    $imagePath = null;
    if(!empty($_FILES['image']['tmp_name'])){
      $up = __DIR__ . '/uploads/'; if(!is_dir($up)) mkdir($up,0755,true);
      $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
      $fn = uniqid('img_',true) . '.' . $ext; $dest = $up . $fn;
      if(move_uploaded_file($_FILES['image']['tmp_name'], $dest)) $imagePath = 'backend/uploads/'.$fn;
    }
    $stmt = $pdo->prepare('INSERT INTO products (name,sku,category,supplier,qty,reorder_threshold,price,image_path) VALUES (?,?,?,?,?,?,?,?)');
    $stmt->execute([$name,$sku,$category,$supplier,$qty,$reorder,$price,$imagePath]);
    // if initial qty >0 create movement
    $pid = $pdo->lastInsertId(); if($qty>0){ $mv = $pdo->prepare('INSERT INTO movements (product_id,`type`,qty,note,user_id) VALUES (?,?,?,?,?)'); $mv->execute([$pid,'in',$qty,'Initial stock', $_SESSION['user_id'] ?? null]); }
    jsonOk(['id'=>$pid]);
  }

  if($action === 'update'){
    requireAdmin(); $id = (int)($_POST['id'] ?? 0); if(!$id) jsonErr('Missing id');
    $name = trim($_POST['name'] ?? ''); if(!$name) jsonErr('Name required');
    $stmt = $pdo->prepare('UPDATE products SET name=?,sku=?,category=?,supplier=?,qty=?,reorder_threshold=?,price=? WHERE id=?');
    $stmt->execute([$name,$_POST['sku'] ?? null,$_POST['category'] ?? null,$_POST['supplier'] ?? null,(int)$_POST['qty'],($_POST['reorder']!==''? (int)$_POST['reorder'] : null),(float)$_POST['price'],$id]);
    jsonOk();
  }

  if($action === 'delete'){
    requireAdmin(); $id = (int)($_POST['id'] ?? 0); if(!$id) jsonErr('Missing id');
    $stmt = $pdo->prepare('DELETE FROM products WHERE id=?'); $stmt->execute([$id]); jsonOk();
  }

  jsonErr('No action');
}catch(Exception $e){ jsonErr('Server error: '.$e->getMessage()); }
