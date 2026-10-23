package com.noteworkshop.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record NoteRequest(
        @NotBlank(message = "图书名称不能为空")
        @Size(max = 100, message = "图书名称过长")
        String bookName,

        @NotBlank(message = "标题不能为空")
        @Size(max = 100, message = "标题过长")
        String title,

        @NotBlank(message = "正文不能为空")
        String content,

        Integer isPublic,

        List<String> images
) {
}
