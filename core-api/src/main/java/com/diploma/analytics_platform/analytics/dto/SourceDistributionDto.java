package com.diploma.analytics_platform.analytics.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class SourceDistributionDto {
    private String source;
    private long count;
    private double percentage;
}