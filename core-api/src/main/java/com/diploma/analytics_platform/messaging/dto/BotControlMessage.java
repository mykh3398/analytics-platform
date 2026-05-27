package com.diploma.analytics_platform.messaging.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BotControlMessage {
    private String action;      // "start" | "stop"
    private String instanceId;
    private String token;
}