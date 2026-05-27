package com.diploma.analytics_platform.auth;

import com.diploma.analytics_platform.multitenancy.WorkspaceAwarePrincipal;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import java.util.List;
import java.util.Map;

public class JwtAuthToken extends AbstractAuthenticationToken
        implements WorkspaceAwarePrincipal {

    private final Long userId;
    private final String email;
    private final Map<Long, String> workspaceRoles;

    public JwtAuthToken(Long userId, String email, Map<Long, String> workspaceRoles) {
        super(List.of());
        this.userId = userId;
        this.email = email;
        this.workspaceRoles = workspaceRoles;
        setAuthenticated(true);
    }

    @Override public Long getUserId() { return userId; }
    @Override public String getEmail() { return email; }

    public Map<Long, String> getWorkspaceRoles() {
        return workspaceRoles;
    }
    @Override
    public Long getWorkspaceId() {
        return workspaceRoles.keySet().stream().findFirst().orElse(null);
    }

    @Override public Object getPrincipal() { return email; }
    @Override public Object getCredentials() { return null; }
    @Override public String getName() { return email; }
}