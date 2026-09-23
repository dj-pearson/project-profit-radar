import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { ExpenseTracker } from '@/components/expenses/ExpenseTracker';

const Expenses = () => {
  return (
    <AccessiblePageWrapper pageTitle="Expense Tracking">
    <DashboardLayout hasAccessibleWrapper title="Expense Tracking">
      <div className="space-y-6">
        <ExpenseTracker />
      </div>
    </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default Expenses;
