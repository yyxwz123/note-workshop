package com.noteworkshop.note.dto;

import com.noteworkshop.note.Note;

import java.util.List;

public record NoteDetail(Note note, List<String> images, boolean liked, String aiType, String aiContent) {
}
