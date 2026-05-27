package com.diploma.analytics_platform.workspace.dto;

import com.diploma.analytics_platform.domain.model.WorkspaceRole;
import lombok.Data;

@Data
public class AddMemberRequestDto {
    private String email;
    private WorkspaceRole role;
}