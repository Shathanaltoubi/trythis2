Store Organizer - Backend (PHP + MySQL)
=====================================

Quick setup (XAMPP on Windows)

1. Copy this `backend/` folder into `C:\xampp\htdocs\store-organizer\backend` or similar.
2. Start Apache & MySQL (XAMPP control panel).
3. Create database & tables: import `create_tables.sql` via phpMyAdmin or CLI:

```bash
mysql -u root -p < create_tables.sql
```

4. Edit `db.php` if your MySQL credentials differ.
5. Ensure `backend/uploads/` is writable by the web server (on Windows it's typically fine).
6. Open `http://localhost/store-organizer/backend/index.php` to view API list.

Notes:
- Passwords use PHP `password_hash`/`password_verify`.
- Use sessions (`auth.php`) for login/logout; protect admin endpoints by checking `$_SESSION['role']`.
- Front-end can call these endpoints via `fetch()` or by posting forms.
