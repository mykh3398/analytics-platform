package com.diploma.analytics_platform.messaging.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MetaControlMessage {
    private String action;       // "add_page" | "remove_page"
    private String pageId;       // Meta Page ID
    private String instanceId;
    private String workspaceId;
    private String accessToken;
    private String platform;     // "INSTAGRAM" | "FACEBOOK"
}