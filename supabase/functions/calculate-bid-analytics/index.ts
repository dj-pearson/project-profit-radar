import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.0.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { company_id, period = 'monthly', start_date, end_date } = await req.json();

    console.log('Calculating bid analytics for:', { company_id, period, start_date, end_date });

    // Get bid submissions for the period
    const { data: bids, error: bidsError } = await supabaseClient
      .from('bid_submissions')
      .select('*')
      .eq('company_id', company_id)
      .gte('submitted_at', start_date)
      .lte('submitted_at', end_date);

    if (bidsError) {
      console.error('Error fetching bids:', bidsError);
      throw bidsError;
    }

    console.log(`Found ${bids?.length || 0} bids for analysis`);

    // Calculate metrics
    const totalBids = bids?.length || 0;
    const wonBids = bids?.filter(bid => bid.win_loss_status === 'won') || [];
    const lostBids = bids?.filter(bid => bid.win_loss_status === 'lost') || [];
    
    const totalWon = wonBids.length;
    const totalLost = lostBids.length;
    const winRate = totalBids > 0 ? (totalWon / totalBids) * 100 : 0;
    
    const totalBidValue = bids?.reduce((sum, bid) => sum + (bid.bid_amount || 0), 0) || 0;
    const totalWonValue = wonBids.reduce((sum, bid) => sum + (bid.bid_amount || 0), 0);
    const averageBidAmount = totalBids > 0 ? totalBidValue / totalBids : 0;
    const averageMargin = wonBids.length > 0 
      ? wonBids.reduce((sum, bid) => sum + (bid.margin_percentage || 0), 0) / wonBids.length 
      : 0;
    
    const totalBidCosts = bids?.reduce((sum, bid) => sum + (bid.bid_cost || 0), 0) || 0;
    const roi = totalBidCosts > 0 ? ((totalWonValue - totalBidCosts) / totalBidCosts) * 100 : 0;

    // Analyze loss reasons
    const lossReasons = lostBids
      .map(bid => bid.loss_reason)
      .filter(reason => reason)
      .reduce((acc: Record<string, number>, reason: string) => {
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {});

    const topLossReasons = Object.entries(lossReasons)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }));

    // Analyze competitors
    const competitors = wonBids
      .filter(bid => bid.competitor_winner)
      .reduce((acc: Record<string, number>, bid) => {
        const competitor = bid.competitor_winner!;
        acc[competitor] = (acc[competitor] || 0) + 1;
        return acc;
      }, {});

    const topCompetitors = Object.entries(competitors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([competitor, wins]) => ({ competitor, wins }));

    // Calculate trends (simplified)
    const performanceTrends = {
      win_rate_trend: winRate,
      margin_trend: averageMargin,
      bid_cost_efficiency: totalBidCosts > 0 ? totalWonValue / totalBidCosts : 0
    };

    // Create analytics record
    const analyticsData = {
      company_id,
      analysis_period: period,
      period_start: start_date,
      period_end: end_date,
      total_bids_submitted: totalBids,
      total_bids_won: totalWon,
      total_bids_lost: totalLost,
      win_rate_percentage: winRate,
      total_bid_value: totalBidValue,
      total_won_value: totalWonValue,
      average_bid_amount: averageBidAmount,
      average_margin_percentage: averageMargin,
      total_bid_costs: totalBidCosts,
      roi_percentage: roi,
      top_loss_reasons: topLossReasons,
      top_competitors: topCompetitors,
      performance_trends: performanceTrends
    };

    // Insert or update analytics record
    const { data: analytics, error: analyticsError } = await supabaseClient
      .from('bid_analytics')
      .upsert(analyticsData, {
        onConflict: 'company_id,analysis_period,period_start,period_end'
      })
      .select()
      .single();

    if (analyticsError) {
      console.error('Error saving analytics:', analyticsError);
      throw analyticsError;
    }

    console.log('Analytics calculated successfully:', analyticsData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analytics: analyticsData,
        insights: {
          performance_summary: `Win rate: ${winRate.toFixed(1)}%, Average margin: ${averageMargin.toFixed(1)}%`,
          top_challenge: topLossReasons[0]?.reason || 'No loss reasons recorded',
          top_competitor: topCompetitors[0]?.competitor || 'No competitor data'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in calculate-bid-analytics function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to calculate bid analytics'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});