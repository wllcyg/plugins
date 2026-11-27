-- Cloudflare D1 留言板数据表结构
-- 初始化命令: npx wrangler d1 execute 100free-guestbook --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nickname TEXT NOT NULL,
  plugin_id TEXT NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
