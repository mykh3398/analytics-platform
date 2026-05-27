package com.diploma.analytics_platform.api;

import com.diploma.analytics_platform.domain.model.User;
import com.diploma.analytics_platform.domain.model.Workspace;
import com.diploma.analytics_platform.domain.model.WorkspaceMember;
import com.diploma.analytics_platform.domain.model.WorkspaceMemberId;
import com.diploma.analytics_platform.domain.model.WorkspaceRole;
import com.diploma.analytics_platform.domain.repository.UserRepository;
import com.diploma.analytics_platform.domain.repository.WorkspaceMemberRepository;
import com.diploma.analytics_platform.domain.repository.WorkspaceRepository;
import com.diploma.analytics_platform.workspace.WorkspaceService;
import com.diploma.analytics_platform.workspace.dto.CreateWorkspaceRequestDto;
import com.diploma.analytics_platform.workspace.dto.UserWorkspaceResponseDto;
import com.diploma.analytics_platform.workspace.dto.WorkspaceResponseDto;
import com.diploma.analytics_platform.workspace.dto.WorkspaceSettingsDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;


    @GetMapping("/workspace/settings")
    public ResponseEntity<WorkspaceSettingsDto> getSettings() {
        return ResponseEntity.ok(workspaceService.getSettings());
    }

    @PutMapping("/workspace/settings")
    public ResponseEntity<WorkspaceSettingsDto> updateSettings(
            @Valid @RequestBody WorkspaceSettingsDto dto) {
        return ResponseEntity.ok(workspaceService.updateSettings(dto));
    }

    @GetMapping("/workspaces")
    public ResponseEntity<List<UserWorkspaceResponseDto>> getUserWorkspaces() {
        log.info("Отримання списку робочих просторів для поточного користувача");

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Користувача не знайдено"));

        List<WorkspaceMember> memberships = workspaceMemberRepository.findByUserId(currentUser.getId());

        List<UserWorkspaceResponseDto> response = memberships.stream().map(member -> {
            UserWorkspaceResponseDto dto = new UserWorkspaceResponseDto();
            dto.setWorkspaceId(member.getWorkspace().getId());
            dto.setWorkspaceName(member.getWorkspace().getName());
            dto.setRole(member.getRole());
            return dto;
        }).toList();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/workspaces")
    @Transactional
    public ResponseEntity<WorkspaceResponseDto> createWorkspace(@RequestBody CreateWorkspaceRequestDto request) {
        log.info("Створення нового робочого простору з назвою: {}", request.getName());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Користувача не знайдено"));

        long ownedWorkspacesCount = workspaceMemberRepository.countByUserIdAndRole(currentUser.getId(), WorkspaceRole.OWNER);

        log.info("Користувач id={} має {} власних просторів", currentUser.getId(), ownedWorkspacesCount);

        if (ownedWorkspacesCount >= 3) {
            log.warn("Користувач id={} перевищив ліміт створення просторів", currentUser.getId());
            throw new IllegalArgumentException("Досягнуто ліміт: максимум 3 власні простори.");
        }

        Workspace newWorkspace = new Workspace();
        newWorkspace.setName(request.getName());
        newWorkspace.setOwner(currentUser);
        newWorkspace.setCreatedAt(LocalDateTime.now());

        Workspace savedWorkspace = workspaceRepository.save(newWorkspace);

        WorkspaceMember newMember = new WorkspaceMember();
        WorkspaceMemberId memberId = new WorkspaceMemberId();
        memberId.setUserId(currentUser.getId());
        memberId.setWorkspaceId(savedWorkspace.getId());

        newMember.setId(memberId);
        newMember.setWorkspace(savedWorkspace);
        newMember.setUser(currentUser);
        newMember.setRole(WorkspaceRole.OWNER);
        newMember.setJoinedAt(LocalDateTime.now());

        workspaceMemberRepository.save(newMember);

        WorkspaceResponseDto response = new WorkspaceResponseDto();
        response.setId(savedWorkspace.getId());
        response.setName(savedWorkspace.getName());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/workspaces/{id}")
    @Transactional
    public ResponseEntity<?> deleteWorkspace(@PathVariable Long id) {
        log.info("Спроба видалення простору id={}", id);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userEmail = authentication.getName();

        User currentUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("Користувача не знайдено"));

        Workspace workspace = workspaceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Простір не знайдено"));

        if (!workspace.getOwner().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).body("Тільки власник (OWNER) може видалити цей простір");
        }

        List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceId(id);
        workspaceMemberRepository.deleteAll(members);

        workspaceRepository.delete(workspace);

        log.info("Простір id={} успішно видалено", id);
        return ResponseEntity.noContent().build();
    }
}