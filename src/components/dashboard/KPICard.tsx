import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number | string;
  changeLabel?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  icon?: React.ReactNode | React.ComponentType<any>;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'success' | 'warning' | 'danger' | 'info';
  progress?: number;
  target?: number;
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

export const KPICard = ({
  title,
  value,
  change,
  changeLabel,
  changeType,
  subtitle,
  icon,
  trend = 'neutral',
  status = 'info',
  progress,
  target,
  className,
  ariaLabel
}: KPICardProps) => {
  const getTrendIcon = () => {
    const trendToUse = changeType === 'positive' ? 'up' :
                       changeType === 'negative' ? 'down' : trend;

    switch (trendToUse) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600 border-green-200 bg-green-50';
      case 'warning':
        return 'text-yellow-600 border-yellow-200 bg-yellow-50';
      case 'danger':
        return 'text-red-600 border-red-200 bg-red-50';
      default:
        return 'text-blue-600 border-blue-200 bg-blue-50';
    }
  };

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `$${(val / 1000000).toFixed(1)}M`;
      } else if (val >= 1000) {
        return `$${(val / 1000).toFixed(0)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  // Generate screen reader text for the KPI
  const getScreenReaderText = () => {
    let text = `${title}: ${formatValue(value)}`;
    if (change !== undefined) {
      const trendText = changeType === 'positive' || trend === 'up' ? 'increased' :
                        changeType === 'negative' || trend === 'down' ? 'decreased' : 'unchanged';
      text += `, ${trendText} by ${typeof change === 'number' ? Math.abs(change) + '%' : change}`;
    }
    if (subtitle) {
      text += `, ${subtitle}`;
    }
    if (progress !== undefined) {
      text += `, progress ${progress}%${target ? ` of ${target}` : ''}`;
    }
    if (status === 'warning') {
      text += ', attention required';
    } else if (status === 'danger') {
      text += ', action needed';
    }
    return text;
  };

  const cardId = `kpi-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <Card
      className={cn("relative overflow-hidden", className)}
      role="region"
      aria-labelledby={`${cardId}-title`}
      aria-describedby={`${cardId}-description`}
    >
      {/* Screen reader only description */}
      <span id={`${cardId}-description`} className="sr-only">
        {ariaLabel || getScreenReaderText()}
      </span>

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle
          id={`${cardId}-title`}
          className="text-sm font-medium text-muted-foreground"
        >
          {title}
        </CardTitle>
        {icon && (
          <div
            className={cn("p-2 rounded-md", getStatusColor())}
            aria-hidden="true"
          >
            {React.isValidElement(icon) ? icon : React.createElement(icon as React.ComponentType, { className: "h-4 w-4" })}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div
              className="text-2xl font-bold"
              aria-label={`Value: ${formatValue(value)}`}
            >
              {formatValue(value)}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {(change !== undefined || changeLabel) && (
            <div
              className="flex items-center gap-1"
              aria-label={change !== undefined ?
                `Change: ${typeof change === 'number' ? (change > 0 ? '+' : '') + change + '%' : change}` :
                changeLabel
              }
            >
              {getTrendIcon()}
              <div className="text-xs">
                {change !== undefined && (
                  <span className={cn(
                    "font-medium",
                    (changeType === 'positive' || trend === 'up') ? 'text-green-600' :
                    (changeType === 'negative' || trend === 'down') ? 'text-red-600' : 'text-muted-foreground'
                  )}>
                    {typeof change === 'number' ? (change > 0 ? '+' : '') + change + '%' : change}
                  </span>
                )}
                {changeLabel && (
                  <p className="text-muted-foreground">{changeLabel}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {progress !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {progress}%{target && ` of ${target}`}
              </span>
            </div>
            <Progress
              value={progress}
              className="h-2"
              aria-label={`Progress: ${progress}%${target ? ` of ${target}` : ''}`}
            />
          </div>
        )}

        {status === 'warning' && (
          <div
            className="flex items-center gap-1 mt-2 text-xs text-yellow-600"
            role="alert"
            aria-live="polite"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span>Attention required</span>
          </div>
        )}

        {status === 'danger' && (
          <div
            className="flex items-center gap-1 mt-2 text-xs text-red-600"
            role="alert"
            aria-live="assertive"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span>Action needed</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
