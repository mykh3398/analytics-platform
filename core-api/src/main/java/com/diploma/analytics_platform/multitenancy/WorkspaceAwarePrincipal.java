package com.diploma.analytics_platform.multitenancy;

public interface WorkspaceAwarePrincipal {
    Long getUserId();
    Long getWorkspaceId();
    String getEmail();
}