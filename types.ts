
export enum AgentRole {
  TaxAI = 'TaxAI',
  LedgerAI = 'LedgerAI',
  PayrollAI = 'PayrollAI',
  CashFlowAI = 'CashFlowAI',
  RiskAI = 'RiskAI',
  AuditAI = 'AuditAI',
  ContractAI = 'ContractAI',
  ComplianceAI = 'ComplianceAI',
  ForecastAI = 'ForecastAI',
  AlertAI = 'AlertAI',
  AnalyticsAI = 'AnalyticsAI',
  CheckAI = 'CheckAI',
}

export type ViewType = 'hub' | 'ledger' | 'compliance' | 'strategy' | 'setup' | 'agent-detail';

export interface SubAgent {
  name: string;
  type: 'recursive' | 'refinement';
  status: 'idle' | 'processing' | 'complete';
  output?: string;
  // Fixed: Added description property used in constants.tsx
  description: string;
}

export interface Agent {
  id: AgentRole;
  name: string;
  specialization: string;
  role: string;
  color: string;
  status: 'idle' | 'processing' | 'verifying' | 'alerting';
  subAgents: [SubAgent, SubAgent]; // [Recursive, Refinement]
  // Fixed: Added tooltip property to match the data defined in constants.tsx
  tooltip: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agentDetails?: {
    agentId: AgentRole;
    recursiveLog: string;
    refinementLog: string;
  }[];
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  taxImpact: number;
  status: 'pending' | 'cleared' | 'flagged';
  agentAuditTrail: string[];
}

export interface FinancialState {
  cash: number;
  unpaidTax: number;
  payrollLiability: number;
  riskScore: number;
  runwayMonths: number;
}
