package com.diploma.analytics_platform.workspace.dto;

import com.diploma.analytics_platform.domain.model.Workspace.ModelType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkspaceSettingsDto {

    @NotBlank
    private String workspaceName;

    @NotNull
    private ModelType modelType;        // "DEFAULT" | "CUSTOM"

    private String customModelId;       // null якщо modelType=DEFAULT
}