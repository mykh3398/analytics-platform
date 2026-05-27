package com.diploma.analytics_platform.analytics.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class HeatmapDto {
    private int dayOfWeek;  // 0=Sun .. 6=Sat
    private int hourUtc;
    private long count;
}
