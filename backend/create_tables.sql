-- Create database and tables for Store Organizer
CREATE DATABASE IF NOT EXISTS store_organizer DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE store_organizer;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  pass_hash VARCHAR(255) NOT NULL,
  role ENUM('customer','cashier','admin') DEFAULT 'customer',
  email VARCHAR(255),
  phone VARCHAR(50),
  security_question VARCHAR(255),
  security_answer_hash VARCHAR(255),
  failed_attempts INT DEFAULT 0,
  locked_until BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  category VARCHAR(100),
  supplier VARCHAR(150),
  qty INT DEFAULT 0,
  reorder_threshold INT DEFAULT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  image_path VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  `type` ENUM('in','out') NOT NULL,
  qty INT NOT NULL,
  note TEXT,
  user_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX (product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  items_json JSON NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  paid_amount DECIMAL(10,2) DEFAULT 0,
  change_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
