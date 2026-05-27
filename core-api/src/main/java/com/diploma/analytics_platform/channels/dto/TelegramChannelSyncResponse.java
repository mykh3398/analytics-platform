package com.diploma.analytics_platform.channels.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TelegramChannelSyncResponse {
    private String instanceId;
    private String token;
}