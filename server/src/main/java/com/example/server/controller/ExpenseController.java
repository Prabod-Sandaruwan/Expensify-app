package com.example.server.controller;

import com.example.server.dto.CategorySummary;
import com.example.server.dto.CreateExpenseRequest;
import com.example.server.entity.Expense;
import com.example.server.entity.User;
import com.example.server.repository.ExpenseRepository;
import com.example.server.repository.UserRepository;
import com.example.server.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; // Added for logging
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j // Logs will show in your IDE console
@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    private Long getUserIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.error("Missing or invalid Authorization header");
            throw new RuntimeException("Invalid authorization header");
        }
        String token = authHeader.substring(7);
        return jwtUtil.extractUserId(token);
    }

    @GetMapping
    public ResponseEntity<List<Expense>> getAll(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        return ResponseEntity.ok(expenseRepository.findByUserIdOrderByDateDesc(userId));
    }

    @PostMapping
    public ResponseEntity<Expense> create(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody CreateExpenseRequest request) {
        Long userId = getUserIdFromToken(authHeader);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Expense expense = Expense.builder()
                .description(request.getDescription())
                .amount(request.getAmount())
                .date(request.getDate())
                .category(request.getCategory())
                .user(user)
                .build();
        
        Expense saved = expenseRepository.save(expense);
        log.info("Saved expense: {} for user: {}", saved.getAmount(), userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/summary")
    public ResponseEntity<List<CategorySummary>> getSummary(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        return ResponseEntity.ok(expenseRepository.findCategorySummariesByUserId(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {
        Long userId = getUserIdFromToken(authHeader);
        
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        
        if (!expense.getUser().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        expenseRepository.delete(expense);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/total")
    public ResponseEntity<Map<String, Double>> getTotalExpenses(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        Long userId = getUserIdFromToken(authHeader);
        Double total = expenseRepository.getTotalExpenseByUserId(userId);
        
        // Wrap the response in a Map to ensure it's valid JSON: {"total": 123.45}
        Map<String, Double> response = new HashMap<>();
        response.put("total", total != null ? total : 0.0);
        
        log.info("Total requested for user {}: {}", userId, response.get("total"));
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/reset")
    public ResponseEntity<Void> resetAll(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        expenseRepository.deleteAllByUserId(userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/analytics/category")
    public ResponseEntity<List<CategorySummary>> getMonthlyCategoryAnalytics(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        LocalDate now = LocalDate.now();
        LocalDate start = now.withDayOfMonth(1);
        LocalDate end = now.withDayOfMonth(now.lengthOfMonth());
        return ResponseEntity.ok(expenseRepository.findMonthlyCategorySummariesByUserId(userId, start, end));
    }

    @GetMapping("/budget")
    public ResponseEntity<Map<String, Object>> getBudget(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        LocalDate now = LocalDate.now();
        LocalDate start = now.withDayOfMonth(1);
        LocalDate end = now.withDayOfMonth(now.lengthOfMonth());
        Double monthTotal = expenseRepository.getTotalExpenseByUserIdAndDateBetween(userId, start, end);
        BigDecimal limit = user.getMonthlyLimit();
        double limitValue = limit != null ? limit.doubleValue() : 0.0;
        double totalValue = monthTotal != null ? monthTotal : 0.0;
        double remaining = Math.max(0.0, limitValue - totalValue);
        double percent = limitValue > 0 ? (totalValue / limitValue) * 100.0 : 0.0;
        Map<String, Object> resp = new HashMap<>();
        resp.put("monthlyLimit", limitValue);
        resp.put("monthTotal", totalValue);
        resp.put("remaining", remaining);
        resp.put("percent", percent);
        return ResponseEntity.ok(resp);
    }

    @PutMapping("/budget")
    public ResponseEntity<Void> updateBudget(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, Object> body) {
        Long userId = getUserIdFromToken(authHeader);
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        Object raw = body.get("monthlyLimit");
        if (raw == null) return ResponseEntity.badRequest().build();
        BigDecimal limit;
        try {
            if (raw instanceof Number) {
                limit = BigDecimal.valueOf(((Number) raw).doubleValue());
            } else {
                limit = new BigDecimal(String.valueOf(raw));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
        user.setMonthlyLimit(limit);
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }
}
