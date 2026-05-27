package com.diploma.analytics_platform.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.TenantId;

import java.time.LocalDateTime;

@Entity
@Table(name = "categories", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"workspace_id", "name"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_lead", nullable = false)
    private boolean lead;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @TenantId
    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}