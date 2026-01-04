<?php
// export.php?type=orders|movements&from=YYYY-MM-DD&to=YYYY-MM-DD
require_once __DIR__ . '/db.php';
function respCsv($name, $rows){
  header('Content-Type: text/csv; charset=utf-8');
  header('Content-Disposition: attachment; filename="' . $name . '"');
  $out = fopen('php://output','w');
  foreach($rows as $r) fputcsv($out, $r);
  fclose($out); exit;
}
try{
  $pdo = getPDO();
  $type = $_GET['type'] ?? 'orders'; $from = $_GET['from'] ?? null; $to = $_GET['to'] ?? null;
  $params = [];
  if($type === 'orders'){
    $q = 'SELECT id,user_id,subtotal,tax_percent,discount,total,payment_method,paid_amount,change_amount,created_at FROM orders WHERE 1=1';
    if($from){ $q .= ' AND created_at >= ?'; $params[] = $from . ' 00:00:00'; }
    if($to){ $q .= ' AND created_at <= ?'; $params[] = $to . ' 23:59:59'; }
    $q .= ' ORDER BY created_at DESC';
    $stmt = $pdo->prepare($q); $stmt->execute($params); $rows = $stmt->fetchAll();
    $out = [['id','user_id','subtotal','tax_percent','discount','total','payment_method','paid_amount','change_amount','created_at']];
    foreach($rows as $r) $out[] = [$r['id'],$r['user_id'],$r['subtotal'],$r['tax_percent'],$r['discount'],$r['total'],$r['payment_method'],$r['paid_amount'],$r['change_amount'],$r['created_at']];
    respCsv('orders.csv',$out);
  }
  if($type === 'movements'){
    $q = 'SELECT m.id,m.product_id,p.name as product_name,m.type,m.qty,m.note,m.user_id,m.created_at FROM movements m LEFT JOIN products p ON p.id=m.product_id WHERE 1=1';
    if($from){ $q .= ' AND m.created_at >= ?'; $params[] = $from . ' 00:00:00'; }
    if($to){ $q .= ' AND m.created_at <= ?'; $params[] = $to . ' 23:59:59'; }
    $q .= ' ORDER BY m.created_at DESC';
    $stmt = $pdo->prepare($q); $stmt->execute($params); $rows = $stmt->fetchAll();
    $out = [['id','product_id','product_name','type','qty','note','user_id','created_at']];
    foreach($rows as $r) $out[] = [$r['id'],$r['product_id'],$r['product_name'],$r['type'],$r['qty'],$r['note'],$r['user_id'],$r['created_at']];
    respCsv('movements.csv',$out);
  }
  header('HTTP/1.1 400 Bad Request'); echo 'Invalid type';
}catch(Exception $e){ header('HTTP/1.1 500 Internal Server Error'); echo 'Server error'; }
