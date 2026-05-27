package com.diploma.analytics_platform.analytics.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TopicDto {
    private String category;
    private Long count;
    private Double percentage;
}