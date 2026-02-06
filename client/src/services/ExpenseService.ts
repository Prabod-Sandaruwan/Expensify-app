import type { Expense, CreateExpenseRequest } from '../types/expense';
import { authService } from './authService';

const API_BASE = import.meta.env.DEV ? '' : 'http://localhost:8080';

function getAuthHeaders() {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
}

export async function getExpenses(): Promise<Expense[]> {
  const response = await fetch(`${API_BASE}/api/expenses`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch expenses');
  }
  return response.json();
}

export async function createExpense(data: CreateExpenseRequest): Promise<Expense> {
  const response = await fetch(`${API_BASE}/api/expenses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create expense');
  }
  return response.json();
}

export async function deleteExpense(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/expenses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete expense');
  }
}

export async function resetAllExpenses(): Promise<void> {
  const response = await fetch(`${API_BASE}/api/expenses/reset`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to reset expenses');
  }
}

export interface CategorySummary {
  category: string;
  total: number;
}

export async function getCategorySummary(): Promise<CategorySummary[]> {
  const response = await fetch(`${API_BASE}/api/analytics/category`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch summary');
  }
  return response.json();
}

export async function getBudget(): Promise<{ monthlyLimit: number; monthTotal: number; remaining: number; percent: number }> {
  const response = await fetch(`${API_BASE}/api/budget`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch budget');
  }
  return response.json();
}

export async function updateBudget(monthlyLimit: number): Promise<void> {
  const response = await fetch(`${API_BASE}/api/budget`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ monthlyLimit }),
  });
  if (!response.ok) {
    throw new Error('Failed to update budget');
  }
}

export async function getAnalyticsTotal(): Promise<CategorySummary[]> {
  const response = await fetch(`${API_BASE}/api/analytics/total`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch analytics total');
  }
  return response.json();
}

export async function getAnalyticsWeekly(): Promise<{ date: string; total: number }[]> {
  const response = await fetch(`${API_BASE}/api/analytics/weekly`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch weekly analytics');
  }
  return response.json();
}

export async function getAnalyticsMonthly(): Promise<{ year: number; month: number; total: number }[]> {
  const response = await fetch(`${API_BASE}/api/analytics/monthly`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch monthly analytics');
  }
  return response.json();
}

export async function getAverageDaily(): Promise<{ averageDaily: number; daysElapsed: number }> {
  const response = await fetch(`${API_BASE}/api/analytics/average-daily`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to fetch average daily');
  }
  return response.json();
}
