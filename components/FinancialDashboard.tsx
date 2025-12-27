import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

const data = [
  { name: 'Jan', revenue: 45000, tax: 8000, risk: 10 },
  { name: 'Feb', revenue: 52000, tax: 9200, risk: 15 },
  { name: 'Mar', revenue: 48000, tax: 8500, risk: 22 },
  { name: 'Apr', revenue: 61000, tax: 11000, risk: 12 },
  { name: 'May', revenue: 55000, tax: 9800, risk: 8 },
];

const FinancialDashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 h-full animate-reveal stagger-2">
      <div className="bg-white border border-silver/30 p-10 rounded-[48px] business-shadow hover-lift">
        <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] mb-8 flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-gold" />
          Money Flow Insight
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b45309" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#b45309" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#cbd5e1" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '12px', boxShadow: '0 15px 30px -5px rgba(0,0,0,0.05)' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#b45309" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="tax" stroke="#475569" strokeWidth={2} strokeDasharray="6 6" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-silver/30 p-10 rounded-[48px] business-shadow hover-lift">
        <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em] mb-8 flex items-center gap-4">
          <div className="w-2.5 h-2.5 rounded-full bg-navy opacity-30" />
          Recursive Risk Map
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#cbd5e1" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: '#fefaf6' }}
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', fontSize: '12px', boxShadow: '0 15px 30px -5px rgba(0,0,0,0.05)' }}
              />
              <Bar dataKey="risk" radius={[8, 8, 0, 0]} barSize={28}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.risk > 15 ? '#b45309' : '#0f172a'} opacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;