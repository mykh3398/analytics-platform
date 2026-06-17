package com.diploma.analytics_platform.auth;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;

public class SystemAuthToken extends AbstractAuthenticationToken {

    private final Long targetWorkspaceId;

    public SystemAuthToken(Long workspaceId) {
        super(List.of(new SimpleGrantedAuthority("ROLE_SYSTEM")));
        this.targetWorkspaceId = workspaceId;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() { return null; }

    @Override
    public Object getPrincipal() { return "system@internal"; }

    public Long getTargetWorkspaceId() { return targetWorkspaceId; }
}