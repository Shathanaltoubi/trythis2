<?php
// auth.php - simple endpoints for register, login, logout. Returns JSON.
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/db.php';

function jsonErr($msg){ echo json_encode(['ok'=>false,'error'=>$msg]); exit; }
function jsonOk($data=[]){ echo json_encode(array_merge(['ok'=>true], $data)); exit; }

$action = $_POST['action'] ?? $_GET['action'] ?? '';
try{
  $pdo = getPDO();
  if($action === 'register'){
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $role = $_POST['role'] ?? 'customer';
    if(!$username || strlen($password) < 8) jsonErr('Invalid username or password (min 8 chars)');
    $stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?'); $stmt->execute([$username]);
    if($stmt->fetch()) jsonErr('Username already exists');
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('INSERT INTO users (username, pass_hash, role) VALUES (?, ?, ?)');
    $stmt->execute([$username, $hash, $role]);
    jsonOk(['msg'=>'Account created']);
  }

  if($action === 'login'){
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    if(!$username || !$password) jsonErr('Provide username and password');
    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?'); $stmt->execute([$username]);
    $u = $stmt->fetch(); if(!$u) jsonErr('User not found');
    if($u['locked_until'] && time() < (int)$u['locked_until']) jsonErr('Account temporarily locked');
    if(!password_verify($password, $u['pass_hash'])){
      $fa = (int)$u['failed_attempts'] + 1;
      $locked = null;
      if($fa >= 5){ $locked = time() + 15*60; }
      $stmt = $pdo->prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?');
      $stmt->execute([$fa, $locked, $u['id']]);
      jsonErr('Wrong password');
    }
    // success
    $stmt = $pdo->prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?'); $stmt->execute([$u['id']]);
    $_SESSION['user_id'] = $u['id']; $_SESSION['username'] = $u['username']; $_SESSION['role'] = $u['role'];
    jsonOk(['msg'=>'Logged in','user'=>['id'=>$u['id'],'username'=>$u['username'],'role'=>$u['role']]]);
  }

  if($action === 'logout'){
    session_unset(); session_destroy(); jsonOk(['msg'=>'Logged out']);
  }

  if($action === 'me'){
    if(!isset($_SESSION['user_id'])) jsonErr('Not logged');
    jsonOk(['user'=>['id'=>$_SESSION['user_id'],'username'=>$_SESSION['username'],'role'=>$_SESSION['role']]]);
  }

  jsonErr('No action');

}catch(Exception $e){ jsonErr('Server error: ' . $e->getMessage()); }
