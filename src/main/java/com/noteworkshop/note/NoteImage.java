package com.noteworkshop.note;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("note_image")
public class NoteImage {

    @TableId(type = IdType.AUTO)
    private Long id;

    private Long noteId;
    private String url;
    private Integer sort;
}
