package com.diploma.analytics_platform.workspace;

import com.diploma.analytics_platform.domain.model.Workspace;
import com.diploma.analytics_platform.domain.repository.WorkspaceRepository;
import com.diploma.analytics_platform.multitenancy.WorkspaceContext;
import com.diploma.analytics_platform.workspace.dto.WorkspaceSettingsDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceContext workspaceContext;

    public WorkspaceSettingsDto getSettings() {
        Workspace workspace = getCurrentWorkspace();
        return toDto(workspace);
    }

    @Transactional
    public WorkspaceSettingsDto updateSettings(WorkspaceSettingsDto dto) {
        Workspace workspace = getCurrentWorkspace();

        workspace.setName(dto.getWorkspaceName());
        workspace.setModelType(dto.getModelType());

        if (dto.getModelType() == Workspace.ModelType.CUSTOM) {
            workspace.setCustomModelId(dto.getCustomModelId());
        } else {
            workspace.setCustomModelId(null);
        }

        Workspace saved = workspaceRepository.save(workspace);
        log.info("Workspace settings updated: id={} name={} modelType={}",
                saved.getId(), saved.getName(), saved.getModelType());

        return toDto(saved);
    }

    public Workspace getCurrentWorkspace() {
        Long workspaceId = workspaceContext.getCurrentWorkspaceId();

        return workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Workspace не знайдено: " + workspaceId));
    }

    public Workspace getWorkspaceById(Long id) {
        return workspaceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Workspace не знайдено: " + id));
    }

    private WorkspaceSettingsDto toDto(Workspace w) {
        return WorkspaceSettingsDto.builder()
                .workspaceName(w.getName())
                .modelType(w.getModelType())
                .customModelId(w.getCustomModelId())
                .build();
    }
}