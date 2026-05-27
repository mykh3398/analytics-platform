package com.diploma.analytics_platform.nlp.dto;

import lombok.*;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ClassifyRequest {
    private Long workspaceId;
    private String text;
    private List<String> categories;
    private String customModelId;
}