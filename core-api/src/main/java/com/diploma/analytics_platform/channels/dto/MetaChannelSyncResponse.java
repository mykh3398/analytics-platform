package com.diploma.analytics_platform.channels.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class MetaChannelSyncResponse {
    private String pageId;
    private String instanceId;
    private String workspaceId;
    private String accessToken;
    private String platform;    // "INSTAGRAM" | "FACEBOOK"
}