package com.diploma.analytics_platform.training.dto;

import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class PendingMessageDto {
    private Long id;
    private String text;
    private String source;
    private String sentAt;
}