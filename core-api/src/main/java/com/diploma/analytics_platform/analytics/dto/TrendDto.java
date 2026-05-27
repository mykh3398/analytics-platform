package com.diploma.analytics_platform.analytics.dto;

import lombok.*;
import java.time.LocalDate;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class TrendDto {
    private LocalDate date;
    private long count;
}
