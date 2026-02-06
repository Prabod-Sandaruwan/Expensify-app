package com.example.server.dto;

import java.time.LocalDate;

public class DailyTotal {
    private LocalDate date;
    private Double total;

    public DailyTotal(LocalDate date, Double total) {
        this.date = date;
        this.total = total;
    }

    public LocalDate getDate() {
        return date;
    }

    public Double getTotal() {
        return total;
    }
}
