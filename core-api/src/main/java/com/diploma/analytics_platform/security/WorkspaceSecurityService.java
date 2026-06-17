package com.diploma.analytics_platform.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Map;

@Service("securityService")
public class WorkspaceSecurityService {
    public boolean hasAnyRole(Long workspaceId, String... allowedRoles) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (!(auth instanceof JwtAuthToken jwtAuthToken)) {
            return false;
        }

        Map<Long, String> roles = jwtAuthToken.getWorkspaceRoles();
        String userRole = roles.get(workspaceId);

        if (userRole == null) {
            return false;
        }

        return Arrays.asList(allowedRoles).contains(userRole);
    }

    public boolean hasAccessToWorkspace(Long workspaceId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (!(auth instanceof JwtAuthToken jwtAuthToken)) {
            return false;
        }

        return jwtAuthToken.getWorkspaceRoles().containsKey(workspaceId);
    }
}