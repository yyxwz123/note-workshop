package com.noteworkshop.admin.dto;

import jakarta.validation.constraints.Size;

public record ReviewRequest(
        boolean approved,
        @Size(max = 200, message = "驳回原因最长 200 字") String reason
) {
}
