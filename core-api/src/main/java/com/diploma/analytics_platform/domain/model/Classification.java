package com.diploma.analytics_platform.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.TenantId;

import java.time.LocalDateTime;

@Entity
@Table(name = "classifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Classification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private UnifiedMessage message;

    @Column(nullable = false)
    private String category;            // SALES, FAQ, BOOKING, COMPLAINT, OTHER

    @Column(name = "confidence")
    private Double confidence;          // 0.0 - 1.0

    @Column(name = "entities", columnDefinition = "TEXT")
    private String entities;            // JSON масив знайдених сутностей

    @Column(name = "is_lead")
    private Boolean isLead;

    @Column(name = "classified_at")
    private LocalDateTime classifiedAt;
    @TenantId
    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;

    @Column(name = "is_manual", nullable = false)
    private boolean isManual = false;
}