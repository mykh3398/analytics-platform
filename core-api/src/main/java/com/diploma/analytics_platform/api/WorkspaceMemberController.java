package com.diploma.analytics_platform.api;

import com.diploma.analytics_platform.domain.model.User;
import com.diploma.analytics_platform.domain.model.Workspace;
import com.diploma.analytics_platform.domain.model.WorkspaceMember;
import com.diploma.analytics_platform.domain.model.WorkspaceRole;
import com.diploma.analytics_platform.domain.repository.UserRepository;
import com.diploma.analytics_platform.domain.repository.WorkspaceMemberRepository;
import com.diploma.analytics_platform.domain.repository.WorkspaceRepository;
import com.diploma.analytics_platform.workspace.dto.AddMemberRequestDto;
import com.diploma.analytics_platform.workspace.dto.MemberResponseDto;
import com.diploma.analytics_platform.workspace.dto.UpdateMemberRoleRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/members")
@RequiredArgsConstructor
public class WorkspaceMemberController {

    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    @GetMapping
    @PreAuthorize("@securityService.hasAnyRole(#workspaceId, 'OWNER', 'EDITOR', 'VIEWER')")
    public ResponseEntity<List<MemberResponseDto>> getMembers(@PathVariable Long workspaceId) {
        log.info("Отримання списку учасників для workspaceId={}", workspaceId);
        List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceId(workspaceId);
        return ResponseEntity.ok(members.stream().map(this::toDto).collect(Collectors.toList()));
    }

    @PostMapping
    @Transactional
    @PreAuthorize("@securityService.hasAnyRole(#workspaceId, 'OWNER')")
    public ResponseEntity<?> addMember(@PathVariable Long workspaceId, @RequestBody AddMemberRequestDto request) {
        log.info("Додавання учасника email={} role={} до workspaceId={}", request.getEmail(), request.getRole(), workspaceId);

        if (request.getRole() == WorkspaceRole.OWNER) {
            return ResponseEntity.badRequest().body("У просторі може бути лише один OWNER. Ви не можете додати ще одного.");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Користувача з таким email не знайдено"));

        Workspace workspace = workspaceRepository.findById(workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("Workspace не знайдено"));

        if (workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId()).isPresent()) {
            return ResponseEntity.badRequest().body("Користувач вже є учасником цього простору");
        }

        WorkspaceMember newMember = new WorkspaceMember();

        com.diploma.analytics_platform.domain.model.WorkspaceMemberId memberId =
                new com.diploma.analytics_platform.domain.model.WorkspaceMemberId();
        memberId.setUserId(user.getId());
        memberId.setWorkspaceId(workspaceId);
        newMember.setId(memberId);

        newMember.setWorkspace(workspace);
        newMember.setUser(user);
        newMember.setRole(request.getRole());
        newMember.setJoinedAt(LocalDateTime.now());

        workspaceMemberRepository.save(newMember);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{userId}")
    @Transactional
    @PreAuthorize("@securityService.hasAnyRole(#workspaceId, 'OWNER')")
    public ResponseEntity<?> updateRole(@PathVariable Long workspaceId,
                                        @PathVariable Long userId,
                                        @RequestBody UpdateMemberRoleRequestDto request) {
        log.info("Оновлення ролі для userId={} у workspaceId={} на {}", userId, workspaceId, request.getRole());

        if (request.getRole() == WorkspaceRole.OWNER) {
            return ResponseEntity.badRequest().body("Передача прав OWNER наразі не підтримується.");
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByEmail(authentication.getName()).orElseThrow();

        if (userId.equals(currentUser.getId())) {
            return ResponseEntity.badRequest().body("Ви не можете змінити власну роль.");
        }

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Учасника не знайдено у цьому просторі"));

        member.setRole(request.getRole());
        workspaceMemberRepository.save(member);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{userId}")
    @Transactional
    @PreAuthorize("@securityService.hasAnyRole(#workspaceId, 'OWNER')")
    public ResponseEntity<?> removeMember(@PathVariable Long workspaceId, @PathVariable Long userId) {
        log.info("Видалення userId={} з workspaceId={}", userId, workspaceId);

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User currentUser = userRepository.findByEmail(authentication.getName()).orElseThrow();

        if (userId.equals(currentUser.getId())) {
            return ResponseEntity.badRequest().body("Власник не може видалити сам себе з простору.");
        }

        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Учасника не знайдено у цьому просторі"));

        workspaceMemberRepository.delete(member);
        return ResponseEntity.ok().build();
    }

    private MemberResponseDto toDto(WorkspaceMember member) {
        MemberResponseDto dto = new MemberResponseDto();
        dto.setId(member.getUser().getId());
        dto.setEmail(member.getUser().getEmail());
        dto.setFirstName(member.getUser().getFirstName());
        dto.setLastName(member.getUser().getLastName());
        dto.setRole(member.getRole());
        dto.setJoinedAt(member.getJoinedAt());
        return dto;
    }
}