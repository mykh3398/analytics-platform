package com.diploma.analytics_platform.category;

import com.diploma.analytics_platform.domain.model.Category;
import com.diploma.analytics_platform.domain.repository.CategoryRepository;
import com.diploma.analytics_platform.domain.repository.ClassificationRepository;
import com.diploma.analytics_platform.domain.repository.TrainingExampleRepository;
import com.diploma.analytics_platform.multitenancy.WorkspaceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final TrainingExampleRepository trainingExampleRepository;
    private final ClassificationRepository classificationRepository;
    private final WorkspaceContext workspaceContext;

    public List<Category> getAllCategories() {
        return categoryRepository.findAllByOrderByCreatedAtAsc();
    }

    @Transactional
    public Category createCategory(String name, boolean isLead) {
        Long workspaceId = getCurrentWorkspaceId();

        if (categoryRepository.existsByWorkspaceIdAndName(workspaceId, name)) {
            throw new IllegalArgumentException("Категорія з такою назвою вже існує");
        }

        Category category = Category.builder()
                .name(name)
                .lead(isLead)
                .build();

        return categoryRepository.save(category);
    }

    @Transactional
    public Category toggleLead(Long id) {
        Category cat = getCategoryAndCheckAccess(id);
        cat.setLead(!cat.isLead());
        return categoryRepository.save(cat);
    }

    @Transactional
    public Category updateIsLead(Long id, boolean isLead) {
        Category cat = getCategoryAndCheckAccess(id);
        cat.setLead(isLead);
        return categoryRepository.save(cat);
    }

    @Transactional
    public void deleteCategory(Long categoryId, String targetCategoryName) {
        Long workspaceId = getCurrentWorkspaceId();
        Category categoryToDelete = getCategoryAndCheckAccess(categoryId);
        String oldCategoryName = categoryToDelete.getName();

        if (targetCategoryName != null && !targetCategoryName.trim().isEmpty()) {
            if (!categoryRepository.existsByWorkspaceIdAndName(workspaceId, targetCategoryName)) {
                throw new IllegalArgumentException("Цільова категорія не існує");
            }
            trainingExampleRepository.reassignCategory(workspaceId, oldCategoryName, targetCategoryName);
            classificationRepository.reassignCategory(workspaceId, oldCategoryName, targetCategoryName);
            log.info("Категорії змерджено: повідомлення з '{}' перенесені в '{}'", oldCategoryName, targetCategoryName);
        } else {
            trainingExampleRepository.deleteByWorkspaceIdAndCategory(workspaceId, oldCategoryName);
            classificationRepository.revertStatusToNormalized(workspaceId, oldCategoryName);
            classificationRepository.deleteByWorkspaceIdAndCategory(workspaceId, oldCategoryName);
            log.info("Категорія '{}' видалена. Повідомлення повернуті в чергу.", oldCategoryName);
        }

        categoryRepository.delete(categoryToDelete);
    }

    private Category getCategoryAndCheckAccess(Long id) {
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Категорію не знайдено"));

        if (!cat.getWorkspaceId().equals(getCurrentWorkspaceId())) {
            throw new AccessDeniedException("Немає доступу до цієї категорії");
        }
        return cat;
    }

    private Long getCurrentWorkspaceId() {
        return workspaceContext.getCurrentWorkspaceId();
    }
}