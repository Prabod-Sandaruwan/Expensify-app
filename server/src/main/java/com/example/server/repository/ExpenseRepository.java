package com.example.server.repository;

import com.example.server.dto.CategorySummary;
import com.example.server.entity.Expense;
import com.example.server.dto.DailyTotal;
import com.example.server.dto.MonthlyTotal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param; // Added this import
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // 1️⃣ Find all expenses for a specific user
    List<Expense> findByUserIdOrderByDateDesc(Long userId);

    // 2️⃣ Find category summaries for a specific user
    @Query("SELECT new com.example.server.dto.CategorySummary(e.category, SUM(e.amount)) " +
           "FROM Expense e WHERE e.user.id = :userId GROUP BY e.category ORDER BY e.category")
    List<CategorySummary> findCategorySummariesByUserId(@Param("userId") Long userId);

    // 3️⃣ Fixed Total Method: Handles NULL values by returning 0.0
    @Query("SELECT COALESCE(SUM(e.amount), 0.0) FROM Expense e WHERE e.user.id = :userId")
    Double getTotalExpenseByUserId(@Param("userId") Long userId);

    // Monthly total for a specific user between date range
    @Query("SELECT COALESCE(SUM(e.amount), 0.0) FROM Expense e WHERE e.user.id = :userId AND e.date BETWEEN :start AND :end")
    Double getTotalExpenseByUserIdAndDateBetween(@Param("userId") Long userId, @Param("start") java.time.LocalDate start, @Param("end") java.time.LocalDate end);

    // Optional: General summary
    @Query("SELECT new com.example.server.dto.CategorySummary(e.category, SUM(e.amount)) " +
           "FROM Expense e GROUP BY e.category ORDER BY e.category")
    List<CategorySummary> findCategorySummaries();

    // 4️⃣ Delete all expenses for a specific user (Reset)
    @Modifying
    @Transactional
    @Query("DELETE FROM Expense e WHERE e.user.id = :userId")
    void deleteAllByUserId(@Param("userId") Long userId);

    // Monthly category summaries for a specific user
    @Query("SELECT new com.example.server.dto.CategorySummary(e.category, SUM(e.amount)) " +
           "FROM Expense e WHERE e.user.id = :userId AND e.date BETWEEN :start AND :end GROUP BY e.category ORDER BY e.category")
    List<CategorySummary> findMonthlyCategorySummariesByUserId(@Param("userId") Long userId, @Param("start") java.time.LocalDate start, @Param("end") java.time.LocalDate end);

    // 5️⃣ All-time category summary for a specific user
    @Query("SELECT new com.example.server.dto.CategorySummary(e.category, SUM(e.amount)) " +
           "FROM Expense e WHERE e.user.id = :userId GROUP BY e.category ORDER BY e.category")
    List<CategorySummary> findAllTimeCategorySummariesByUserId(@Param("userId") Long userId);

    // 6️⃣ Daily totals between date range for a user
    @Query(value = "SELECT e.date AS d, SUM(e.amount) AS total " +
                   "FROM expenses e WHERE e.user_id = :userId AND e.date BETWEEN :start AND :end " +
                   "GROUP BY e.date ORDER BY e.date", nativeQuery = true)
    List<Object[]> findDailyTotalsByUserIdAndDateBetween(@Param("userId") Long userId, @Param("start") java.time.LocalDate start, @Param("end") java.time.LocalDate end);

    // 7️⃣ Monthly totals for last 6 months for a user
    @Query(value = "SELECT YEAR(e.date) AS yr, MONTH(e.date) AS mon, SUM(e.amount) AS total " +
                   "FROM expenses e WHERE e.user_id = :userId AND e.date >= :start " +
                   "GROUP BY YEAR(e.date), MONTH(e.date) ORDER BY YEAR(e.date), MONTH(e.date)", nativeQuery = true)
    List<Object[]> findMonthlyTotalsFrom(@Param("userId") Long userId, @Param("start") java.time.LocalDate start);
}
