package com.diploma.analytics_platform.workspace.dto;

import com.diploma.analytics_platform.domain.model.WorkspaceRole;
import lombok.Data;

@Data
public class UserWorkspaceResponseDto {
    private Long workspaceId;
    private String workspaceName;
    private WorkspaceRole role;
}