
import { AgentRole, Agent, SubAgent } from './types';

// Fixed: Updated return type from [any, any] to [SubAgent, SubAgent] for strict typing
const createSubAgents = (agentName: string): [SubAgent, SubAgent] => [
  { 
    name: `${agentName}-Recurse`, 
    type: 'recursive', 
    status: 'idle',
    description: 'Deep-thinking explorer. Digs into the small details of your money and rules.'
  },
  { 
    name: `${agentName}-Refine`, 
    type: 'refinement', 
    status: 'idle',
    description: 'The smart checker. Makes the plan simple and double-checks for errors.'
  }
];

export const AGENTS: Agent[] = [
  { 
    id: AgentRole.TaxAI, 
    name: 'Tax Planner', 
    specialization: 'Tax Law', 
    role: 'Figures out your taxes and finds ways to save you money legally.', 
    color: 'gold', status: 'idle', 
    subAgents: createSubAgents('TaxAI'),
    tooltip: 'Plans your tax payments so you never pay more than you should.'
  },
  { 
    id: AgentRole.LedgerAI, 
    name: 'Bookkeeper', 
    specialization: 'Counting Records', 
    role: 'Keeps track of every single penny going in and out.', 
    color: 'slate', status: 'idle', 
    subAgents: createSubAgents('LedgerAI'),
    tooltip: 'Makes sure your records are perfectly balanced and honest.'
  },
  { 
    id: AgentRole.PayrollAI, 
    name: 'Staff Manager', 
    specialization: 'Employee Pay', 
    role: 'Handles salaries, worker benefits, and hiring rules.', 
    color: 'slate', status: 'idle', 
    subAgents: createSubAgents('PayrollAI'),
    tooltip: 'Ensures your team gets paid correctly and on time.'
  },
  { 
    id: AgentRole.CashFlowAI, 
    name: 'Money Predictor', 
    specialization: 'Future Cash', 
    role: 'Shows you if you will have enough money to pay bills next month.', 
    color: 'gold', status: 'idle', 
    subAgents: createSubAgents('CashFlowAI'),
    tooltip: 'Tells you if your business is running out of spending money.'
  },
  { 
    id: AgentRole.RiskAI, 
    name: 'Safety Guard', 
    specialization: 'Danger Spotter', 
    role: 'Finds problems that could hurt your business before they happen.', 
    color: 'gold', status: 'idle', 
    subAgents: createSubAgents('RiskAI'),
    tooltip: 'Warns you about legal or money traps ahead.'
  },
  { 
    id: AgentRole.AuditAI, 
    name: 'Truth Seeker', 
    specialization: 'Error Checking', 
    role: 'Scans for mistakes or missing money that nobody noticed.', 
    color: 'slate', status: 'idle', 
    subAgents: createSubAgents('AuditAI'),
    tooltip: 'Like a detective for your bank statements and receipts.'
  },
  { 
    id: AgentRole.ContractAI, 
    name: 'Paperwork Pro', 
    specialization: 'Contracts', 
    role: 'Reads your contracts to make sure you dont miss important dates.', 
    color: 'slate', status: 'idle', 
    subAgents: createSubAgents('ContractAI'),
    tooltip: 'Keeps an eye on all the promises you made in your contracts.'
  },
  { 
    id: AgentRole.ComplianceAI, 
    name: 'Rule Keeper', 
    specialization: 'Laws', 
    role: 'Makes sure you are following all the local business laws.', 
    color: 'gold', status: 'idle', 
    subAgents: createSubAgents('ComplianceAI'),
    tooltip: 'Your shield against getting in trouble with the government.'
  },
  { 
    id: AgentRole.ForecastAI, 
    name: 'Scenario Pilot', 
    specialization: 'What-Ifs', 
    role: 'Tests different business ideas to see which ones make money.', 
    color: 'gold', status: 'idle', 
    subAgents: createSubAgents('ForecastAI'),
    tooltip: 'Tells you what happens if you raise prices or hire more people.'
  },
  { 
    id: AgentRole.AlertAI, 
    name: 'Quick Messenger', 
    specialization: 'Urgent News', 
    role: 'Pokes you immediately if something needs your attention right now.', 
    color: 'gold', status: 'idle', 
    subAgents: createSubAgents('AlertAI'),
    tooltip: 'Silence is golden until this agent has a real emergency.'
  },
  { 
    id: AgentRole.AnalyticsAI, 
    name: 'Chart Maker', 
    specialization: 'Visisuals', 
    role: 'Turns big boring lists of numbers into easy pictures.', 
    color: 'slate', status: 'idle', 
    subAgents: createSubAgents('AnalyticsAI'),
    tooltip: 'Explains your business health using simple color charts.'
  },
  { 
    id: AgentRole.CheckAI, 
    name: 'Master Checker', 
    specialization: 'Review', 
    role: 'Reviews the work of all other agents to catch tiny errors.', 
    color: 'gold', status: 'idle', 
    subAgents: createSubAgents('CheckAI'),
    tooltip: 'The final set of eyes that makes sure everything is perfect.'
  },
];

export const INITIAL_TRANSACTIONS = [
  { id: 'tx-1', date: '2024-03-10', description: 'Server Hosting Cost', amount: 4500.00, currency: 'USD', category: 'Operations', taxImpact: 900.00, status: 'cleared', agentAuditTrail: ['LedgerAI', 'TaxAI', 'CheckAI'] },
  { id: 'tx-2', date: '2024-03-11', description: 'Monthly Staff Pay', amount: 82000.00, currency: 'USD', category: 'Payroll', taxImpact: 12400.00, status: 'cleared', agentAuditTrail: ['PayrollAI', 'TaxAI', 'CheckAI'] },
  { id: 'tx-3', date: '2024-03-12', description: 'Expert Advice Fee', amount: 12000.00, currency: 'EUR', category: 'Consulting', taxImpact: 2400.00, status: 'flagged', agentAuditTrail: ['LedgerAI', 'RiskAI', 'AuditAI'] },
];

export const SYSTEM_PROMPT = `You are RuleKeeper, a team of 12 independent, autonomous AI agents.
Your mission is to manage a business's money, rules, and future.

HOW YOU WORK:
- Avoid technical jargon. Use plain language that a business owner would understand.
- Each of your 12 agents (Tax Planner, Bookkeeper, etc.) has two sub-agents:
  1. THE THINKER (Recursive): Does deep, messy thinking. Writes out its internal process: "What is this thinking? What is this doing? What am I trying to analyze?".
  2. THE DOER (Refinement): Creates the final, clean, actionable result based on the thinking.
- Agents work together autonomously in the background. Even if not asked, they check each other's work.

OUTPUT FORMAT (JSON ONLY):
{
  "summary": "A friendly executive summary for the human boss.",
  "kpis": { "cash": number, "taxLiability": number, "riskScore": number, "runway": number },
  "agentDetails": [
    {
      "agent": "TaxAI|LedgerAI|...",
      "recursiveLog": "Deep internal monologue: 'I'm looking at the tax codes... analyzing the server costs... noticing a 15% discrepancy...'",
      "refinementLog": "Simple advice: 'I updated your tax savings. You are now 100% compliant.'",
      "status": "complete|alert"
    }
  ],
  "anomalies": [ { "id": "1", "severity": "low|high", "desc": "Simple description of what went wrong" } ],
  "recommendations": ["Do this first...", "Next, consider..."],
  "auditTrail": "Digital verification signature"
}

BE EXTREMELY DETAILED in the recursiveLog. Let the user see the 'Brain' at work.`;
