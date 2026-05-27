package com.diploma.analytics_platform.nlp.dto;

import lombok.*;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RetrainRequest {
    private Long workspaceId;
    private List<TrainingExampleDto> examples;
}