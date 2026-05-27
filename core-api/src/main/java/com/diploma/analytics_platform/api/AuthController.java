package com.diploma.analytics_platform.api;

import com.diploma.analytics_platform.auth.AuthService;
import com.diploma.analytics_platform.auth.dto.*;
import com.diploma.analytics_platform.domain.model.User;
import com.diploma.analytics_platform.domain.model.WorkspaceMember;
import com.diploma.analytics_platform.domain.repository.WorkspaceMemberRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal User user) {
        List<WorkspaceMember> memberships = workspaceMemberRepository.findAllByUserId(user.getId());

        Map<Long, String> responseRoles = memberships.stream()
                .collect(Collectors.toMap(
                        m -> m.getWorkspace().getId(),
                        m -> m.getRole().name()
                ));

        Long defaultWorkspaceId = memberships.isEmpty() ? null : memberships.get(0).getWorkspace().getId();
        String defaultWorkspaceName = memberships.isEmpty() ? null : memberships.get(0).getWorkspace().getName();

        return ResponseEntity.ok(UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .companyName(user.getCompanyName())
                .workspaceId(defaultWorkspaceId)
                .workspaceName(defaultWorkspaceName)
                .workspaceRoles(responseRoles)
                .build());
    }
}