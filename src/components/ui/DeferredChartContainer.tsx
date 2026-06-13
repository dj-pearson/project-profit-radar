import React from 'react';
import { ChartContainer } from '@/components/ui/chart';
import { DeferUntilVisible } from '@/components/ui/DeferUntilVisible';

type ChartContainerProps = React.ComponentProps<typeof ChartContainer>;

/**
 * A drop-in replacement for <ChartContainer> that defers mounting the chart
 * (and therefore the Recharts render work) until it scrolls into view (US-218).
 * Use on chart-heavy/dashboard pages so below-the-fold charts don't render — or
 * pay their parse cost — on initial load.
 */
export function DeferredChartContainer(props: ChartContainerProps) {
  return (
    <DeferUntilVisible minHeight={300}>
      <ChartContainer {...props} />
    </DeferUntilVisible>
  );
}

export default DeferredChartContainer;
