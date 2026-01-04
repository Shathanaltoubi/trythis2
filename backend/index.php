<?php
// Simple backend index page linking to API docs
session_start();
?>
<!doctype html>
<html lang="en" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Store Organizer - Backend</title>
<style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;background:#f7fbfb} a{color:#0ea5a4}</style></head>
<body>
  <h1>Store Organizer - Backend</h1>
  <p>APIs (POST/GET) available under this folder:</p>
  <ul>
    <li><strong>auth.php</strong> - actions: register, login, logout, me (POST/GET)</li>
    <li><strong>products.php</strong> - actions: list, get, create, update, delete</li>
    <li><strong>movements.php</strong> - actions: list, add</li>
    <li><strong>orders.php</strong> - actions: create, list</li>
    <li><strong>export.php</strong> - download CSV for orders/movements</li>
  </ul>
  <p>Put front-end files in the parent folder and call these endpoints via fetch() or forms.</p>
</body></html>
