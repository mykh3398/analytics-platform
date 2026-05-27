package com.diploma.analytics_platform.auth;

import com.diploma.analytics_platform.auth.dto.*;
import com.diploma.analytics_platform.domain.model.*;
import com.diploma.analytics_platform.domain.repository.UserRepository;
import com.diploma.analytics_platform.domain.repository.WorkspaceRepository;
import com.diploma.analytics_platform.domain.repository.WorkspaceMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authManager;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalArgumentException("Email вже використовується");
        }

        User user = User.builder()
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .firstName(req.getFirstName())
                .lastName(req.getLastName())
                .companyName(req.getCompanyName())
                .build();
        userRepository.save(user);

        String workspaceName = req.getCompanyName() != null && !req.getCompanyName().isBlank()
                ? req.getCompanyName()
                : req.getFirstName() + "'s Workspace";

        Workspace workspace = Workspace.builder()
                .name(workspaceName)
                .owner(user)
                .build();
        workspaceRepository.save(workspace);

        WorkspaceMember member = WorkspaceMember.builder()
                .id(new WorkspaceMemberId(user.getId(), workspace.getId()))
                .user(user)
                .workspace(workspace)
                .role(WorkspaceRole.OWNER)
                .build();
        workspaceMemberRepository.save(member);

        log.info("Зареєстровано {} з workspace id={}", user.getEmail(), workspace.getId());

        Map<String, String> roles = Map.of(String.valueOf(workspace.getId()), WorkspaceRole.OWNER.name());
        String token = jwtService.generateToken(user.getId(), user.getEmail(), roles);

        return buildResponse(user, workspace, token, Map.of(workspace.getId(), WorkspaceRole.OWNER.name()));
    }
    @Transactional
    public AuthResponse login(LoginRequest req) {
        authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));

        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Користувача не знайдено"));

        List<WorkspaceMember> memberships = workspaceMemberRepository.findAllByUserId(user.getId());
        if (memberships.isEmpty()) {
            throw new IllegalStateException("У користувача немає жодного Workspace");
        }

        Map<String, String> stringRoles = memberships.stream()
                .collect(Collectors.toMap(
                        m -> String.valueOf(m.getWorkspace().getId()),
                        m -> m.getRole().name()
                ));

        Map<Long, String> responseRoles = memberships.stream()
                .collect(Collectors.toMap(
                        m -> m.getWorkspace().getId(),
                        m -> m.getRole().name()
                ));

        String token = jwtService.generateToken(user.getId(), user.getEmail(), stringRoles);

        Workspace firstWorkspace = memberships.get(0).getWorkspace();

        return buildResponse(user, firstWorkspace, token, responseRoles);
    }

    private AuthResponse buildResponse(User user, Workspace workspace, String token, Map<Long, String> allRoles) {
        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .user(UserDto.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .companyName(user.getCompanyName())
                        .workspaceId(workspace.getId())
                        .workspaceName(workspace.getName())
                        .workspaceRoles(allRoles)
                        .build())
                .build();
    }
}