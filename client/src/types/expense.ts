export interface Expense {
  id: number;
  description: string;
  amount: string | number;
  date: string;
  category: string;
}

export interface CreateExpenseRequest {
  description: string;
  amount: string | number;
  date: string;
  category: string;
}

export interface CategorySummary {
  category: string;
  total: number | string;
}
