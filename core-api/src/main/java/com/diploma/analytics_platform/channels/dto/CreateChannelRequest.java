package com.diploma.analytics_platform.channels.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateChannelRequest {
    @NotBlank
    private String type;        // TELEGRAM, INSTAGRAM, FACEBOOK...
    @NotBlank
    private String instanceId;  // sales, support...
    private String token;
    private String label;
}