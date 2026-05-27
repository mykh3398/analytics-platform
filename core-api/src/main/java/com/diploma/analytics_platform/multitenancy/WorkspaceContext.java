package com.diploma.analytics_platform.multitenancy;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WorkspaceContext {

    private final WorkspaceTenantResolver tenantResolver;

    public Long getCurrentWorkspaceId() {
        return tenantResolver.resolveCurrentTenantIdentifier();
    }
}