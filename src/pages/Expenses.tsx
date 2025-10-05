import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ExpenseTracker } from '@/components/expenses/ExpenseTracker';

const Expenses = () => {
  return (
    <DashboardLayout title="Expense Tracking">
      <div className="space-y-6">
        <ExpenseTracker />
      </div>
    </DashboardLayout>
  );
};

export default Expenses;
