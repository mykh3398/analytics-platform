package com.diploma.analytics_platform.nlp.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClassifyResponse {
    private String category;
    private Double confidence;
    private String method;
    private List<EntityDto> entities;
}