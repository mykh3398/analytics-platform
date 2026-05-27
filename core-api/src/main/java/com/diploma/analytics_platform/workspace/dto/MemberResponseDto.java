package com.diploma.analytics_platform.workspace.dto;

import com.diploma.analytics_platform.domain.model.WorkspaceRole;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class MemberResponseDto {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private WorkspaceRole role;
    private LocalDateTime joinedAt;
}

