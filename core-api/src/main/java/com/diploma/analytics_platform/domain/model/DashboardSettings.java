package com.diploma.analytics_platform.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dashboard_settings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSettings {

    @Id
    @Column(name = "workspace_id")
    private Long workspaceId;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "pinned_topics", joinColumns = @JoinColumn(name = "workspace_id"))
    @Column(name = "topic")
    private List<String> pinnedTopics = new ArrayList<>();
}