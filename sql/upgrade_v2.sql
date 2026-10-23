-- 从 V1 升级到 V2（已存在旧库时执行；全新环境直接用 schema.sql 即可）
USE note_workshop;

ALTER TABLE note
  ADD COLUMN reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因' AFTER status,
  ADD COLUMN reviewed_at DATETIME DEFAULT NULL COMMENT '审核时间' AFTER reject_reason;

CREATE INDEX idx_note_status ON note (status);

CREATE TABLE IF NOT EXISTS note_ai (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  note_id    BIGINT      NOT NULL,
  type       VARCHAR(20) NOT NULL,
  content    TEXT        NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_note (note_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记 AI 辅助结果';

CREATE TABLE IF NOT EXISTS ai_call_log (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  user_id    BIGINT       DEFAULT NULL,
  scene      VARCHAR(32)  NOT NULL,
  success    TINYINT      NOT NULL DEFAULT 0,
  error_msg  VARCHAR(255) DEFAULT NULL,
  latency_ms INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_log_time (created_at),
  KEY idx_ai_log_scene (scene)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 调用日志';

CREATE TABLE IF NOT EXISTS ai_chat_session (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  user_id    BIGINT       NOT NULL,
  title      VARCHAR(100) NOT NULL DEFAULT '新的会话',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_session_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 客服会话';

CREATE TABLE IF NOT EXISTS ai_chat_message (
  id         BIGINT   NOT NULL AUTO_INCREMENT,
  session_id BIGINT   NOT NULL,
  role       VARCHAR(16) NOT NULL,
  content    TEXT     NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_msg_session (session_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 客服消息';
