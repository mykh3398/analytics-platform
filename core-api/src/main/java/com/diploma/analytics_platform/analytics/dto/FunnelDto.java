package com.diploma.analytics_platform.analytics.dto;

import lombok.*;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class FunnelDto {
    private long totalMessages;
    private long classified;
    private long leads;
    private Map<String, Long> byCategory;
}
