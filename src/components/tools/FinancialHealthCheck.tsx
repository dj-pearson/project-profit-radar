import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, CheckCircle, TrendingDown, DollarSign, Clock, Brain, Download, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Question {
  id: string;
  question: string;
  options: {
    value: string;
    label: string;
    score: number;
  }[];
  category: 'visibility' | 'efficiency' | 'predictive' | 'accuracy';
}

interface HealthCheckResult {
  totalScore: number;
  categoryScores: {
    visibility: number;
    efficiency: number;
    predictive: number;
    accuracy: number;
  };
  riskLevel: 'critical' | 'high' | 'moderate' | 'good';
  estimatedAnnualCost: number;
  timeWasted: number;
  recommendations: string[];
}

const FinancialHealthCheck = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showEmailCapture, setShowEmailCapture] = useState(false);

  const questions: Question[] = [
    {
      id: "q1",
      question: "How do you currently track project profitability?",
      category: "visibility",
      options: [
        { value: "realtime", label: "Real-time dashboard with live updates", score: 100 },
        { value: "weekly", label: "Weekly spreadsheet updates", score: 50 },
        { value: "monthly", label: "Monthly accounting reports", score: 25 },
        { value: "taxtime", label: "Only know at tax time", score: 0 }
      ]
    },
    {
      id: "q2",
      question: "How long does your month-end financial close take?",
      category: "efficiency",
      options: [
        { value: "minutes", label: "Less than 30 minutes", score: 100 },
        { value: "hours", label: "2-8 hours", score: 60 },
        { value: "days", label: "1-3 days", score: 20 },
        { value: "week", label: "More than 3 days", score: 0 }
      ]
    },
    {
      id: "q3",
      question: "When do you typically discover cost overruns on projects?",
      category: "predictive",
      options: [
        { value: "early", label: "2-3 weeks before they happen (predictive alerts)", score: 100 },
        { value: "during", label: "As they're happening", score: 50 },
        { value: "late", label: "After project completion", score: 10 },
        { value: "never", label: "Usually don't find out until year-end", score: 0 }
      ]
    },
    {
      id: "q4",
      question: "How accurate is your job costing?",
      category: "accuracy",
      options: [
        { value: "veryaccurate", label: "Within 5% - we track everything in real-time", score: 100 },
        { value: "accurate", label: "Within 10% - weekly updates", score: 70 },
        { value: "rough", label: "Within 20% - monthly estimates", score: 30 },
        { value: "guess", label: "We're essentially guessing", score: 0 }
      ]
    },
    {
      id: "q5",
      question: "Can you see the profit margin impact BEFORE approving a change order?",
      category: "visibility",
      options: [
        { value: "instant", label: "Yes, instantly with what-if calculator", score: 100 },
        { value: "calculate", label: "Yes, but I have to manually calculate", score: 50 },
        { value: "estimate", label: "I make a rough estimate", score: 20 },
        { value: "no", label: "No, I find out later", score: 0 }
      ]
    },
    {
      id: "q6",
      question: "How much time do you spend on manual data entry for financials each week?",
      category: "efficiency",
      options: [
        { value: "none", label: "None - it's automated", score: 100 },
        { value: "couple", label: "1-2 hours", score: 60 },
        { value: "several", label: "3-5 hours", score: 30 },
        { value: "many", label: "6+ hours", score: 0 }
      ]
    },
    {
      id: "q7",
      question: "Do you have early warning systems for budget issues?",
      category: "predictive",
      options: [
        { value: "aipredict", label: "Yes - AI predicts issues weeks in advance", score: 100 },
        { value: "alerts", label: "Yes - threshold alerts when we go over", score: 60 },
        { value: "manual", label: "I manually check weekly", score: 30 },
        { value: "no", label: "No early warning system", score: 0 }
      ]
    },
    {
      id: "q8",
      question: "How do you track labor costs on projects?",
      category: "accuracy",
      options: [
        { value: "realtimegps", label: "Real-time GPS time tracking with instant cost updates", score: 100 },
        { value: "dailylog", label: "Daily time sheets entered manually", score: 50 },
        { value: "weeklyest", label: "Weekly estimates from foremen", score: 20 },
        { value: "guess", label: "Rough estimates at project end", score: 0 }
      ]
    },
    {
      id: "q9",
      question: "In the last year, how many projects had unexpected cost overruns?",
      category: "predictive",
      options: [
        { value: "none", label: "None - we catch issues early", score: 100 },
        { value: "few", label: "1-2 projects", score: 60 },
        { value: "some", label: "3-5 projects", score: 30 },
        { value: "many", label: "Most projects had some overrun", score: 0 }
      ]
    },
    {
      id: "q10",
      question: "How is your QuickBooks integration?",
      category: "efficiency",
      options: [
        { value: "automated", label: "Fully automated 2-way sync", score: 100 },
        { value: "import", label: "I export/import files regularly", score: 50 },
        { value: "manual", label: "Manual data entry into QuickBooks", score: 20 },
        { value: "none", label: "No integration - separate systems", score: 0 }
      ]
    },
    {
      id: "q11",
      question: "Can you see current profit margins for ALL active projects right now?",
      category: "visibility",
      options: [
        { value: "instant", label: "Yes, in real-time dashboard", score: 100 },
        { value: "recent", label: "Yes, but data is 1-2 weeks old", score: 50 },
        { value: "calculate", label: "Need to pull reports and calculate", score: 20 },
        { value: "no", label: "No, would take days to figure out", score: 0 }
      ]
    },
    {
      id: "q12",
      question: "What percentage of your projects finish within 5% of estimated profit margin?",
      category: "accuracy",
      options: [
        { value: "most", label: "80%+ (excellent visibility and control)", score: 100 },
        { value: "half", label: "50-80% (decent control)", score: 60 },
        { value: "some", label: "30-50% (struggling with accuracy)", score: 30 },
        { value: "few", label: "Less than 30% (poor visibility)", score: 0 }
      ]
    }
  ];

  const calculateResults = (): HealthCheckResult => {
    let totalScore = 0;
    const categoryScores = {
      visibility: 0,
      efficiency: 0,
      predictive: 0,
      accuracy: 0
    };
    const categoryCounts = {
      visibility: 0,
      efficiency: 0,
      predictive: 0,
      accuracy: 0
    };

    questions.forEach(q => {
      const answer = answers[q.id];
      if (answer) {
        const option = q.options.find(opt => opt.value === answer);
        if (option) {
          totalScore += option.score;
          categoryScores[q.category] += option.score;
          categoryCounts[q.category]++;
        }
      }
    });

    // Normalize category scores
    Object.keys(categoryScores).forEach(key => {
      const cat = key as keyof typeof categoryScores;
      if (categoryCounts[cat] > 0) {
        categoryScores[cat] = Math.round(categoryScores[cat] / categoryCounts[cat]);
      }
    });

    const avgScore = Math.round(totalScore / questions.length);

    // Determine risk level
    let riskLevel: 'critical' | 'high' | 'moderate' | 'good' = 'good';
    if (avgScore < 30) riskLevel = 'critical';
    else if (avgScore < 50) riskLevel = 'high';
    else if (avgScore < 70) riskLevel = 'moderate';

    // Estimate annual costs based on score
    const baseOverrunCost = 80000; // Average contractor loses $80K/year to preventable overruns
    const efficiencyWaste = 50000; // Average $50K/year in wasted time
    const estimatedAnnualCost = Math.round(
      (baseOverrunCost * (1 - avgScore / 100)) +
      (efficiencyWaste * (1 - categoryScores.efficiency / 100))
    );

    // Time wasted (days per year)
    const timeWasted = Math.round(36 * (1 - categoryScores.efficiency / 100));

    // Generate recommendations
    const recommendations: string[] = [];
    if (categoryScores.visibility < 70) {
      recommendations.push("Implement real-time profit margin tracking to see your financial position instantly");
    }
    if (categoryScores.predictive < 70) {
      recommendations.push("Add predictive cost alerts to catch budget issues 2-3 weeks before they become disasters");
    }
    if (categoryScores.efficiency < 70) {
      recommendations.push("Automate your month-end close and QuickBooks sync to save 2-3 days monthly");
    }
    if (categoryScores.accuracy < 70) {
      recommendations.push("Implement real-time job costing with GPS time tracking for accurate labor costs");
    }

    return {
      totalScore: avgScore,
      categoryScores,
      riskLevel,
      estimatedAnnualCost,
      timeWasted,
      recommendations
    };
  };

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [questions[currentQuestion].id]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowEmailCapture(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    if (email) {
      // In production, send email to backend for lead capture
      console.log("Lead captured:", { email, companyName, answers });
      setShowResults(true);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const results = showResults ? calculateResults() : null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-600';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-600';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-600';
      case 'good': return 'text-green-600 bg-green-50 border-green-600';
      default: return 'text-gray-600 bg-gray-50 border-gray-600';
    }
  };

  const getRiskLabel = (level: string) => {
    switch (level) {
      case 'critical': return 'Critical - Significant Financial Risk';
      case 'high': return 'High Risk - Action Needed Soon';
      case 'moderate': return 'Moderate - Room for Improvement';
      case 'good': return 'Good - Keep it Up!';
      default: return 'Unknown';
    }
  };

  if (showEmailCapture && !showResults) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-6 w-6 text-construction-orange" />
              Get Your Personalized Financial Health Report
            </CardTitle>
            <CardDescription>
              You're one step away from discovering exactly how much financial blindness is costing your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-construction-orange/10 p-6 rounded-lg border-l-4 border-construction-orange">
              <h4 className="font-semibold text-construction-dark mb-3">Your report will include:</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-construction-orange flex-shrink-0 mt-0.5" />
                  <span>Financial Intelligence Health Score (0-100)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-construction-orange flex-shrink-0 mt-0.5" />
                  <span>Estimated annual cost of financial blindness for YOUR business</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-construction-orange flex-shrink-0 mt-0.5" />
                  <span>Category breakdowns: Visibility, Efficiency, Predictive, Accuracy</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-construction-orange flex-shrink-0 mt-0.5" />
                  <span>Personalized action plan to improve your financial intelligence</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-construction-orange flex-shrink-0 mt-0.5" />
                  <span>Custom ROI projection for implementing BuildDesk</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Your Construction Company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!email}
              className="w-full"
              variant="hero"
              size="lg"
            >
              <Download className="mr-2 h-5 w-5" />
              Get My Free Financial Health Report
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              We respect your privacy. Your information will never be shared. Unsubscribe anytime.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showResults && results) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="border-2 border-construction-orange">
          <CardHeader>
            <CardTitle className="text-center text-3xl">Your Financial Intelligence Health Score</CardTitle>
            <CardDescription className="text-center text-lg">
              Based on your responses, here's how your business stacks up
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Overall Score */}
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-48 h-48 rounded-full border-8 ${getRiskColor(results.riskLevel)}`}>
                <div>
                  <div className="text-6xl font-bold">{results.totalScore}</div>
                  <div className="text-sm font-semibold">out of 100</div>
                </div>
              </div>
              <div className="mt-4">
                <Badge variant="outline" className={`text-lg px-4 py-2 ${getRiskColor(results.riskLevel)}`}>
                  {getRiskLabel(results.riskLevel)}
                </Badge>
              </div>
            </div>

            {/* Financial Impact */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <DollarSign className="h-6 w-6" />
                    Estimated Annual Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-700">
                    ${results.estimatedAnnualCost.toLocaleString()}
                  </div>
                  <p className="text-sm text-red-600 mt-2">
                    This is what financial blindness is likely costing you per year in:
                  </p>
                  <ul className="text-sm text-red-600 mt-2 space-y-1">
                    <li>• Preventable cost overruns</li>
                    <li>• Poor change order pricing</li>
                    <li>• Wasted administrative time</li>
                    <li>• Missed profit opportunities</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-700">
                    <Clock className="h-6 w-6" />
                    Time Wasted Annually
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-orange-700">
                    {results.timeWasted} days
                  </div>
                  <p className="text-sm text-orange-600 mt-2">
                    Time you could spend growing your business instead of buried in spreadsheets:
                  </p>
                  <ul className="text-sm text-orange-600 mt-2 space-y-1">
                    <li>• Month-end financial close</li>
                    <li>• Manual data entry</li>
                    <li>• QuickBooks reconciliation</li>
                    <li>• Report generation</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Category Scores */}
            <div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-construction-orange" />
                Financial Intelligence Breakdown
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(results.categoryScores).map(([category, score]) => (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{category}</span>
                      <span className="font-bold">{score}/100</span>
                    </div>
                    <Progress value={score} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-construction-orange/10 p-6 rounded-lg border-l-4 border-construction-orange">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-construction-orange" />
                Your Personalized Action Plan
              </h3>
              <ul className="space-y-3">
                {results.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-construction-orange flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ROI Projection */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-green-800">Your BuildDesk ROI Projection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-700">&lt;30 days</div>
                    <div className="text-sm text-green-600">Estimated Payback Period</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700">
                      ${Math.round(results.estimatedAnnualCost * 0.7).toLocaleString()}
                    </div>
                    <div className="text-sm text-green-600">Potential Annual Savings</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-700">{Math.round(results.timeWasted * 0.8)}days</div>
                    <div className="text-sm text-green-600">Time Reclaimed per Year</div>
                  </div>
                </div>
                <p className="text-sm text-green-700 text-center">
                  If you prevent just ONE $40K cost overrun with BuildDesk's early warnings,
                  the platform pays for itself for the next 10 years.
                </p>
              </CardContent>
            </Card>

            {/* CTA */}
            <div className="text-center space-y-4">
              <Button size="lg" variant="hero" asChild>
                <a href="/auth">
                  Start Your Free 14-Day Trial
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">
                No credit card required • See real-time profit margins from day one
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Contractor Financial Intelligence Health Check</CardTitle>
          <CardDescription>
            12 questions • 2 minutes • Discover what financial blindness is costing you
          </CardDescription>
          <div className="pt-4">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Question {currentQuestion + 1} of {questions.length}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {questions[currentQuestion].question}
            </h3>
            <RadioGroup
              value={answers[questions[currentQuestion].id] || ""}
              onValueChange={handleAnswer}
            >
              {questions[currentQuestion].options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary transition-colors">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={!answers[questions[currentQuestion].id]}
              className="flex-1"
              variant="hero"
            >
              {currentQuestion === questions.length - 1 ? "See My Results" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialHealthCheck;
