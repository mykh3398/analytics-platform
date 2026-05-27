package com.diploma.analytics_platform.api;

import com.diploma.analytics_platform.category.CategoryService;
import com.diploma.analytics_platform.category.dto.CreateCategoryRequest;
import com.diploma.analytics_platform.domain.model.Category;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<Category>> getAll() {
        return ResponseEntity.ok(categoryService.getAllCategories());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreateCategoryRequest req) {
        try {
            Category category = categoryService.createCategory(req.getName(), req.isLead());
            return ResponseEntity.ok(category);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/toggle-lead")
    public ResponseEntity<Category> toggleLead(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(categoryService.toggleLead(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/is-lead")
    public ResponseEntity<Category> updateIsLead(
            @PathVariable Long id,
            @RequestParam boolean isLead) {
        try {
            return ResponseEntity.ok(categoryService.updateIsLead(id, isLead));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @RequestParam(required = false) String targetCategory) {
        try {
            categoryService.deleteCategory(id, targetCategory);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("Помилка видалення категорії: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}