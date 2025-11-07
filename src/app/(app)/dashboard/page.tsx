'use client';

import DashboardPage from '@/components/dashboard-page';
import { submitOpinion } from './actions';

export default function EchoChamberPage() {
  return <DashboardPage submitOpinion={submitOpinion} />;
}
