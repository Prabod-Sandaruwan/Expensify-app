package com.example.server.dto;

public class MonthlyTotal {
    private Integer year;
    private Integer month;
    private Double total;

    public MonthlyTotal(Integer year, Integer month, Double total) {
        this.year = year;
        this.month = month;
        this.total = total;
    }

    public Integer getYear() {
        return year;
    }

    public Integer getMonth() {
        return month;
    }

    public Double getTotal() {
        return total;
    }
}
