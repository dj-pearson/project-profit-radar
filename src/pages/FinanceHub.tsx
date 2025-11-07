import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  FileText,
  Receipt,
  CreditCard,
  TrendingUp,
  PieChart,
  DollarSign,
  Building2,
  Calculator,
  ClipboardList,
  Landmark,
  ArrowRightLeft,
  BarChart3,
  FileBarChart,
  Wallet,
  ArrowUpDown,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Finance Hub - Enterprise Finance Management Center
 *
 * Central dashboard for accessing all accounting and finance features:
 * - Chart of Accounts
 * - General Ledger & Journal Entries
 * - Accounts Payable
 * - Accounts Receivable
 * - Bank Reconciliation
 * - Financial Reports
 * - Job Costing (existing feature)
 */
export default function FinanceHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Finance modules configuration
  const financeModules = [
    {
      id: 'chart-of-accounts',
      title: 'Chart of Accounts',
      description: 'Manage your account structure and classifications',
      icon: BookOpen,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      route: '/finance/chart-of-accounts',
      category: 'core',
    },
    {
      id: 'general-ledger',
      title: 'General Ledger',
      description: 'View all accounting transactions and account activity',
      icon: FileText,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      route: '/finance/general-ledger',
      category: 'core',
    },
    {
      id: 'journal-entries',
      title: 'Journal Entries',
      description: 'Create and manage manual journal entries',
      icon: Calculator,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      route: '/finance/journal-entries',
      category: 'core',
    },
    {
      id: 'accounts-payable',
      title: 'Accounts Payable',
      description: 'Manage vendor bills and payments',
      icon: Receipt,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      route: '/finance/accounts-payable',
      category: 'payables',
    },
    {
      id: 'bill-payments',
      title: 'Bill Payments',
      description: 'Pay vendor bills and track payment history',
      icon: CreditCard,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      route: '/finance/bill-payments',
      category: 'payables',
    },
    {
      id: 'accounts-receivable',
      title: 'Accounts Receivable',
      description: 'Manage customer invoices and collections',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      route: '/invoices',
      category: 'receivables',
    },
    {
      id: 'credit-memos',
      title: 'Credit Memos',
      description: 'Issue credits and refunds to customers',
      icon: FileBarChart,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      route: '/finance/credit-memos',
      category: 'receivables',
    },
    {
      id: 'bank-reconciliation',
      title: 'Bank Reconciliation',
      description: 'Reconcile bank accounts and match transactions',
      icon: Landmark,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      route: '/finance/bank-reconciliation',
      category: 'banking',
    },
    {
      id: 'bank-accounts',
      title: 'Bank Accounts',
      description: 'Manage bank account connections and balances',
      icon: Building2,
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      route: '/finance/bank-accounts',
      category: 'banking',
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'Assets, liabilities, and equity summary',
      icon: BarChart3,
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      route: '/finance/balance-sheet',
      category: 'reports',
    },
    {
      id: 'profit-loss',
      title: 'Profit & Loss',
      description: 'Income statement and profitability analysis',
      icon: TrendingUp,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      route: '/finance/profit-loss',
      category: 'reports',
    },
    {
      id: 'cash-flow',
      title: 'Cash Flow Statement',
      description: 'Operating, investing, and financing activities',
      icon: ArrowRightLeft,
      color: 'text-fuchsia-600',
      bgColor: 'bg-fuchsia-50',
      route: '/finance/cash-flow',
      category: 'reports',
    },
    {
      id: 'trial-balance',
      title: 'Trial Balance',
      description: 'Verify general ledger account balances',
      icon: ClipboardList,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      route: '/finance/trial-balance',
      category: 'reports',
    },
    {
      id: 'job-costing',
      title: 'Job Costing',
      description: 'Construction project cost tracking and analysis',
      icon: PieChart,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      route: '/job-costing',
      category: 'job-costing',
    },
    {
      id: 'fiscal-periods',
      title: 'Fiscal Periods',
      description: 'Manage fiscal years and accounting periods',
      icon: Wallet,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      route: '/finance/fiscal-periods',
      category: 'settings',
    },
  ];

  // Group modules by category
  const modulesByCategory = {
    core: financeModules.filter(m => m.category === 'core'),
    payables: financeModules.filter(m => m.category === 'payables'),
    receivables: financeModules.filter(m => m.category === 'receivables'),
    banking: financeModules.filter(m => m.category === 'banking'),
    reports: financeModules.filter(m => m.category === 'reports'),
    'job-costing': financeModules.filter(m => m.category === 'job-costing'),
    settings: financeModules.filter(m => m.category === 'settings'),
  };

  const categoryLabels: Record<string, string> = {
    core: 'Core Accounting',
    payables: 'Accounts Payable',
    receivables: 'Accounts Receivable',
    banking: 'Banking',
    reports: 'Financial Reports',
    'job-costing': 'Job Costing',
    settings: 'Settings',
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Hub</h1>
          <p className="text-muted-foreground mt-1">
            Enterprise-level financial management and accounting
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertDescription>
          Welcome to the enhanced Finance Hub! You now have access to a complete
          double-entry accounting system with Chart of Accounts, General Ledger,
          AP/AR management, bank reconciliation, and comprehensive financial reports.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">All Modules</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">
                  As of today
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Accounts Payable
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">0 open bills</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Accounts Receivable
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">0 open invoices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Income MTD</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$0.00</div>
                <p className="text-xs text-muted-foreground">Month to date</p>
              </CardContent>
            </Card>
          </div>

          {/* Featured Modules */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Featured Modules</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {modulesByCategory.core.map((module) => {
                const IconComponent = module.icon;
                return (
                  <Card
                    key={module.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(module.route)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${module.bgColor}`}>
                          <IconComponent className={`h-5 w-5 ${module.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{module.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{module.description}</CardDescription>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* All Modules Tab */}
        <TabsContent value="modules" className="space-y-6">
          {Object.entries(modulesByCategory).map(([category, modules]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4">
                {categoryLabels[category]}
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {modules.map((module) => {
                  const IconComponent = module.icon;
                  return (
                    <Card
                      key={module.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => navigate(module.route)}
                    >
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${module.bgColor}`}>
                            <IconComponent className={`h-5 w-5 ${module.color}`} />
                          </div>
                          <div>
                            <CardTitle className="text-base">
                              {module.title}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{module.description}</CardDescription>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* Quick Actions Tab */}
        <TabsContent value="quick-actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and frequently used features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/finance/journal-entries/new')}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Create Journal Entry
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/finance/accounts-payable/new')}
              >
                <Receipt className="mr-2 h-4 w-4" />
                Enter New Bill
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/invoices/create')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/finance/bill-payments/new')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Bills
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/finance/bank-reconciliation')}
              >
                <Landmark className="mr-2 h-4 w-4" />
                Reconcile Bank Account
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/finance/balance-sheet')}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                View Balance Sheet
              </Button>
              <Button
                className="w-full justify-start"
                variant="outline"
                onClick={() => navigate('/finance/profit-loss')}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                View Profit & Loss
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Recent transactions and journal entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                No recent activity to display
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
