package com.example.server.controller;
 
import com.example.server.dto.CategorySummary;
import com.example.server.dto.DailyTotal;
import com.example.server.dto.MonthlyTotal;
import com.example.server.entity.User;
import com.example.server.repository.ExpenseRepository;
import com.example.server.repository.UserRepository;
import com.example.server.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
 
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.stream.Collectors;
 
@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BudgetAnalyticsController {
 
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
 
    private Long getUserIdFromToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Invalid authorization header");
        }
        String token = authHeader.substring(7);
        return jwtUtil.extractUserId(token);
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
 
    @GetMapping("/analytics/category")
    public ResponseEntity<List<CategorySummary>> getMonthlyCategoryAnalytics(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        LocalDate now = LocalDate.now();
        LocalDate start = now.withDayOfMonth(1);
        LocalDate end = now.withDayOfMonth(now.lengthOfMonth());
        return ResponseEntity.ok(expenseRepository.findMonthlyCategorySummariesByUserId(userId, start, end));
    }

    @GetMapping("/analytics/total")
    public ResponseEntity<List<CategorySummary>> getAllTimeCategoryAnalytics(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        return ResponseEntity.ok(expenseRepository.findAllTimeCategorySummariesByUserId(userId));
    }

    @GetMapping("/analytics/weekly")
    public ResponseEntity<List<DailyTotal>> getWeeklyDailyTotals(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(6);
        List<Object[]> rows = expenseRepository.findDailyTotalsByUserIdAndDateBetween(userId, start, end);
        List<DailyTotal> raw = rows.stream()
                .map(r -> new DailyTotal(((java.sql.Date) r[0]).toLocalDate(), ((Number) r[1]).doubleValue()))
                .collect(Collectors.toList());
        Map<LocalDate, Double> byDate = raw.stream().collect(Collectors.toMap(DailyTotal::getDate, DailyTotal::getTotal));
        List<DailyTotal> filled = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate d = start.plusDays(i);
            filled.add(new DailyTotal(d, byDate.getOrDefault(d, 0.0)));
        }
        return ResponseEntity.ok(filled);
    }

    @GetMapping("/analytics/monthly")
    public ResponseEntity<List<MonthlyTotal>> getMonthlyTotals(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        YearMonth now = YearMonth.now();
        YearMonth startYm = now.minusMonths(5);
        LocalDate start = startYm.atDay(1);
        List<Object[]> rows = expenseRepository.findMonthlyTotalsFrom(userId, start);
        List<MonthlyTotal> raw = rows.stream()
                .map(r -> new MonthlyTotal(((Number) r[0]).intValue(), ((Number) r[1]).intValue(), ((Number) r[2]).doubleValue()))
                .collect(Collectors.toList());
        Map<YearMonth, Double> byYm = raw.stream().collect(Collectors.toMap(mt -> YearMonth.of(mt.getYear(), mt.getMonth()), MonthlyTotal::getTotal));
        List<MonthlyTotal> filled = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            YearMonth ym = startYm.plusMonths(i);
            Double t = byYm.getOrDefault(ym, 0.0);
            filled.add(new MonthlyTotal(ym.getYear(), ym.getMonthValue(), t));
        }
        return ResponseEntity.ok(filled);
    }

    @GetMapping("/analytics/average-daily")
    public ResponseEntity<Map<String, Object>> getAverageDaily(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        Long userId = getUserIdFromToken(authHeader);
        LocalDate now = LocalDate.now();
        LocalDate start = now.withDayOfMonth(1);
        Double monthTotal = expenseRepository.getTotalExpenseByUserIdAndDateBetween(userId, start, now);
        int daysElapsed = now.getDayOfMonth();
        double avg = daysElapsed > 0 ? ((monthTotal != null ? monthTotal : 0.0) / daysElapsed) : 0.0;
        Map<String, Object> resp = new HashMap<>();
        resp.put("averageDaily", avg);
        resp.put("daysElapsed", daysElapsed);
        return ResponseEntity.ok(resp);
    }
}
