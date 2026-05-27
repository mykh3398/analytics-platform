package com.diploma.analytics_platform.channels.dto;

import com.diploma.analytics_platform.domain.model.Channel.ChannelStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ChannelResponse {
    private Long id;
    private String type;
    private String instanceId;
    private String label;
    private ChannelStatus status;
    private LocalDateTime createdAt;
}