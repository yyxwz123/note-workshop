package com.noteworkshop.note;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@TableName("note")
public class Note {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long userId;
    private String bookName;
    private String title;
    private String content;
    private Integer isPublic;
    private Integer status;
    private String rejectReason;
    private LocalDateTime reviewedAt;
    private Integer likeCount;
    private Integer commentCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @TableField(exist = false)
    private String authorName;

    @TableField(exist = false)
    private String authorAvatar;

    @TableField(exist = false)
    private List<String> images;

    @TableField(exist = false)
    private Boolean liked;
}
