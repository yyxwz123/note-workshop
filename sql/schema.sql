-- 笔记工坊 Note-Workshop 全量建表脚本（V2）
-- MySQL 8.x

CREATE DATABASE IF NOT EXISTS note_workshop
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE note_workshop;

-- 用户表
CREATE TABLE IF NOT EXISTS `user` (
  id          BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键',
  username    VARCHAR(32)  NOT NULL COMMENT '登录名',
  password    VARCHAR(100) NOT NULL COMMENT 'BCrypt 哈希',
  nickname    VARCHAR(32)  NOT NULL COMMENT '昵称',
  avatar      VARCHAR(255) DEFAULT NULL COMMENT '头像 URL',
  bio         VARCHAR(200) DEFAULT NULL COMMENT '个人简介',
  role        VARCHAR(16)  NOT NULL DEFAULT 'USER' COMMENT 'USER / ADMIN',
  status      TINYINT      NOT NULL DEFAULT 1 COMMENT '1 正常 0 禁用',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户';

-- 读书笔记表
CREATE TABLE IF NOT EXISTS note (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  user_id       BIGINT       NOT NULL COMMENT '作者',
  book_name     VARCHAR(100) NOT NULL COMMENT '图书名称',
  title         VARCHAR(100) NOT NULL COMMENT '笔记标题',
  content       TEXT         NOT NULL COMMENT '笔记正文',
  is_public     TINYINT      NOT NULL DEFAULT 0 COMMENT '1 公开 0 私有',
  status        TINYINT      NOT NULL DEFAULT 1 COMMENT '1 正常 2 待审核 3 审核驳回 0 已下架',
  reject_reason VARCHAR(200) DEFAULT NULL COMMENT '驳回原因',
  reviewed_at   DATETIME     DEFAULT NULL COMMENT '审核时间',
  like_count    INT          NOT NULL DEFAULT 0,
  comment_count INT          NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_note_user (user_id),
  KEY idx_note_public (is_public, status, like_count),
  KEY idx_note_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='读书笔记';

-- 笔记配图表
CREATE TABLE IF NOT EXISTS note_image (
  id       BIGINT       NOT NULL AUTO_INCREMENT,
  note_id  BIGINT       NOT NULL,
  url      VARCHAR(255) NOT NULL,
  sort     INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_img_note (note_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记配图';

-- 点赞表
CREATE TABLE IF NOT EXISTS note_like (
  id         BIGINT   NOT NULL AUTO_INCREMENT,
  user_id    BIGINT   NOT NULL,
  note_id    BIGINT   NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_like_user_note (user_id, note_id),
  KEY idx_like_note (note_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞';

-- 评论表（支持二级回复）
CREATE TABLE IF NOT EXISTS comment (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  note_id    BIGINT       NOT NULL,
  user_id    BIGINT       NOT NULL,
  parent_id  BIGINT       NOT NULL DEFAULT 0 COMMENT '0 为一级评论',
  content    VARCHAR(500) NOT NULL,
  deleted    TINYINT      NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comment_note (note_id, deleted),
  KEY idx_comment_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论';

-- 关注表
CREATE TABLE IF NOT EXISTS follow (
  id          BIGINT   NOT NULL AUTO_INCREMENT,
  follower_id BIGINT   NOT NULL COMMENT '关注者',
  followee_id BIGINT   NOT NULL COMMENT '被关注者',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_follow (follower_id, followee_id),
  KEY idx_follow_followee (followee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关注';

-- AI 辅助结果（一篇笔记仅保留一条）
CREATE TABLE IF NOT EXISTS note_ai (
  id         BIGINT      NOT NULL AUTO_INCREMENT,
  note_id    BIGINT      NOT NULL,
  type       VARCHAR(20) NOT NULL COMMENT 'SUMMARY / AUDIENCE / SCORE',
  content    TEXT        NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ai_note (note_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='笔记 AI 辅助结果';

-- AI 调用日志（统计成功/失败）
CREATE TABLE IF NOT EXISTS ai_call_log (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  user_id    BIGINT       DEFAULT NULL,
  scene      VARCHAR(32)  NOT NULL COMMENT 'SUMMARY/AUDIENCE/SCORE/CHAT',
  success    TINYINT      NOT NULL DEFAULT 0,
  error_msg  VARCHAR(255) DEFAULT NULL,
  latency_ms INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ai_log_time (created_at),
  KEY idx_ai_log_scene (scene)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 调用日志';

-- AI 客服会话
CREATE TABLE IF NOT EXISTS ai_chat_session (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  user_id    BIGINT       NOT NULL,
  title      VARCHAR(100) NOT NULL DEFAULT '新的会话',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_session_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 客服会话';

-- AI 客服消息
CREATE TABLE IF NOT EXISTS ai_chat_message (
  id         BIGINT   NOT NULL AUTO_INCREMENT,
  session_id BIGINT   NOT NULL,
  role       VARCHAR(16) NOT NULL COMMENT 'user / assistant',
  content    TEXT     NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_msg_session (session_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 客服消息';
