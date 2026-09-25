import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, ErrorState, Spinner } from '../../components/ui';
import { api } from '../../lib/endpoints';
import { POLL_MS, qk } from '../../lib/query';
import { useDealership } from '../../lib/settings';
import { AgeDistributionChart } from './AgeDistributionChart';
import { AgingActionsChart } from './AgingActionsChart';
import { KpiCards } from './KpiCards';
import { agingActionLink, bucketLink } from './links';
import { NeedsAttention } from './NeedsAttention';

export function OverviewPage() {
  const { currency, thresholdDays } = useDealership();
  const navigate = useNavigate();
  const overview = useQuery({ queryKey: qk.overview, queryFn: api.overview, refetchInterval: POLL_MS });
  const distribution = useQuery({ queryKey: qk.ageDistribution, queryFn: api.ageDistribution, refetchInterval: POLL_MS });
  const agingActions = useQuery({ queryKey: qk.agingActions, queryFn: api.agingActions, refetchInterval: POLL_MS });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Overview</h1>
      {overview.error ? (
        <ErrorState error={overview.error} onRetry={() => overview.refetch()} />
      ) : overview.data ? (
        <>
          <KpiCards report={overview.data} currency={currency} />
          <NeedsAttention counts={overview.data.needsAttention} />
        </>
      ) : (
        <Spinner label="Loading KPIs" />
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Stock by age">
          {distribution.data ? (
            <AgeDistributionChart data={distribution.data} onSelect={(b) => navigate(bucketLink(b))} />
          ) : (
            <Spinner />
          )}
        </Card>
        <Card title={`Aging vehicles (over ${thresholdDays} days) by latest action`}>
          {agingActions.data ? (
            <AgingActionsChart data={agingActions.data} onSelect={(s) => navigate(agingActionLink(s))} />
          ) : (
            <Spinner />
          )}
        </Card>
      </div>
    </div>
  );
}
