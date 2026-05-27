package com.diploma.analytics_platform.api;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
@Order(1)
public class InternalKeyFilter implements Filter {

    @Value("${internal.api.key}")
    private String expectedKey;

    @Override
    public void doFilter(ServletRequest request,
                         ServletResponse response,
                         FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest  req  = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;

        if (req.getRequestURI().startsWith("/api/internal/")) {
            String key = req.getHeader("X-Internal-Key");
            if (!expectedKey.equals(key)) {
                log.warn("Unauthorized internal API access from {}",
                        req.getRemoteAddr());
                resp.setStatus(HttpServletResponse.SC_FORBIDDEN);
                resp.getWriter().write("{\"error\":\"Forbidden\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }
}