package com.diploma.analytics_platform.multitenancy;

import com.diploma.analytics_platform.auth.SystemAuthToken;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.cfg.AvailableSettings;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Map;

@Slf4j
@Component
public class WorkspaceTenantResolver
        implements CurrentTenantIdentifierResolver<Long>,
        HibernatePropertiesCustomizer {

    public static final Long PUBLIC_WORKSPACE_ID = 0L;

    @Override
    public Long resolveCurrentTenantIdentifier() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth instanceof SystemAuthToken systemAuth) {
            return systemAuth.getTargetWorkspaceId();
        }

        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes != null) {
            HttpServletRequest request = attributes.getRequest();
            String workspaceHeader = request.getHeader("X-Workspace-Id");

            log.info("DIAGNOSTIC: Запит до URI: {}, Заголовок X-Workspace-Id: {}",
                    request.getRequestURI(), workspaceHeader);

            if (workspaceHeader != null && !workspaceHeader.isBlank()) {
                try {
                    Long id = Long.parseLong(workspaceHeader);
                    log.info("DIAGNOSTIC: Успішно розпарсили ID простору: {}", id);
                    return id;
                } catch (NumberFormatException e) {
                    log.warn("Некоректний заголовок X-Workspace-Id");
                }
            }
        } else {
            log.info("DIAGNOSTIC: RequestContextHolder.getRequestAttributes() is NULL");
        }

        if (auth instanceof WorkspaceAwarePrincipal principal) {
            log.info("DIAGNOSTIC: Fallback на ID з токена: {}", principal.getWorkspaceId());
            return principal.getWorkspaceId();
        }

        return PUBLIC_WORKSPACE_ID;
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return false;
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        hibernateProperties.put(
                AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, this);
    }
}