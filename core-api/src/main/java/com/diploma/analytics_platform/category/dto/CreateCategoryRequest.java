package com.diploma.analytics_platform.category.dto;

import lombok.Data;

@Data
public class CreateCategoryRequest {
    private String name;
    private boolean isLead;
}
