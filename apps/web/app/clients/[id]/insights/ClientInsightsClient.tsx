'use client';

import { useCallback, useEffect, useState } from 'react';

type ContentPattern = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  change: number;
  metric: string;
  type: 'positive' | 'negative';
};

type FeedbackItem = {
  type: 'positive' | 'neutral' | 'negative';
  text: string;
};

type ClientInsightsClientProps = {
  clientId: string;
};

export default function ClientInsightsClient({ clientId }: ClientInsightsClientProps) {
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<{ positive: ContentPattern[]; negative: ContentPattern[] }>({
    positive: [],
    negative: [],
  });
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    // Simulated data - replace with API call
    setTimeout(() => {
      setPatterns({
        positive: [
          {
            id: '1',
            title: 'UGC-style videos',
            description: 'Raw, handheld aesthetic',
            change: 24,
            metric: 'Avg. Engagement',
            type: 'positive',
          },
          {
            id: '2',
            title: 'Serif-heavy carousels',
            description: 'Editorial storytelling',
            change: 18,
            metric: 'Avg. Engagement',
            type: 'positive',
          },
        ],
        negative: [
          {
            id: '3',
            title: 'Long captions',
            description: '>500 character count',
            change: -12,
            metric: 'Retention Rate',
            type: 'negative',
          },
          {
            id: '4',
            title: 'Highly staged photos',
            description: 'Studio lighting / Over-edited',
            change: -8,
            metric: 'Curation Score',
            type: 'negative',
          },
        ],
      });
      setFeedback([
        { type: 'positive', text: 'Users frequently praise the new glass packaging aesthetic.' },
        { type: 'positive', text: "Strong resonance with the 'Organic Sourcing' narrative." },
        { type: 'neutral', text: 'Inquiries about shipping to secondary markets are rising.' },
        { type: 'neutral', text: 'Price point remains a frequent point of comparison.' },
        { type: 'negative', text: 'Confusion regarding the limited-time holiday flavor availability.' },
        { type: 'negative', text: "Mobile checkout experience mentioned as 'slow' 4 times." },
      ]);
      setLoading(false);
    }, 600);
  }, [clientId]);

  const positiveFeedback = feedback.filter((f) => f.type === 'positive');
  const neutralFeedback = feedback.filter((f) => f.type === 'neutral');
  const negativeFeedback = feedback.filter((f) => f.type === 'negative');

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-3">
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all font-semibold text-sm">
          <span className="material-symbols-outlined text-sm">refresh</span>
          Update Intelligence
        </button>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-semibold text-sm">
          <span className="material-symbols-outlined text-sm text-slate-500">ios_share</span>
          Export
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading insights...</div>
      ) : (
        <>
          {/* Patterns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patterns That Work */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500">trending_up</span>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patterns That Work</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Last 30 Days</span>
              </div>
              <div className="space-y-4">
                {patterns.positive.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined">play_circle</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{pattern.title}</h4>
                        <p className="text-xs text-slate-500">{pattern.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-600 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                        <span>+{pattern.change}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase">{pattern.metric}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Patterns to Avoid */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">trending_down</span>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Patterns to Avoid</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Declining</span>
              </div>
              <div className="space-y-4">
                {patterns.negative.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-3 border border-slate-100 rounded-lg hover:border-red-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined">notes</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{pattern.title}</h4>
                        <p className="text-xs text-slate-500">{pattern.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-500 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                        <span>{pattern.change}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 uppercase">{pattern.metric}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Engagement Trends Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Engagement Trends</h3>
                <p className="text-lg font-bold mt-1 text-slate-700">
                  Correlation: Content Pillars vs. ROI
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FF6600]"></span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Lifestyle</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Product</span>
                </div>
              </div>
            </div>
            <div className="h-48 w-full relative">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
                <path
                  d="M0,180 L100,160 L200,140 L300,150 L400,110 L500,100 L600,60 L700,70 L800,40 L900,30 L1000,10"
                  fill="none"
                  stroke="#FF6600"
                  strokeWidth="3"
                />
                <path
                  d="M0,150 L100,155 L200,160 L300,140 L400,145 L500,130 L600,135 L700,120 L800,125 L900,110 L1000,115"
                  fill="none"
                  stroke="#E2E8F0"
                  strokeWidth="2"
                />
                <line className="text-slate-100" stroke="currentColor" strokeWidth="1" x1="0" x2="1000" y1="200" y2="200" />
              </svg>
              <div className="flex justify-between mt-4 text-[10px] font-bold text-slate-400 uppercase">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
              </div>
            </div>
          </div>

          {/* AI Feedback Aggregator */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI Feedback Aggregator</h3>
              <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                AI ANALYZED
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Positive Sentiment */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <span className="material-symbols-outlined text-sm">sentiment_satisfied</span>
                  <span className="text-[10px] font-bold uppercase">Positive Sentiment</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-2">
                  {positiveFeedback.map((item, idx) => (
                    <li key={idx} className="pl-3 border-l-2 border-green-200">
                      "{item.text}"
                    </li>
                  ))}
                </ul>
              </div>

              {/* Neutral Observations */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-yellow-600">
                  <span className="material-symbols-outlined text-sm">sentiment_neutral</span>
                  <span className="text-[10px] font-bold uppercase">Neutral Observations</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-2">
                  {neutralFeedback.map((item, idx) => (
                    <li key={idx} className="pl-3 border-l-2 border-yellow-200">
                      "{item.text}"
                    </li>
                  ))}
                </ul>
              </div>

              {/* Critical Feedback */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-red-500">
                  <span className="material-symbols-outlined text-sm">sentiment_dissatisfied</span>
                  <span className="text-[10px] font-bold uppercase">Critical Feedback</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-2">
                  {negativeFeedback.map((item, idx) => (
                    <li key={idx} className="pl-3 border-l-2 border-red-200">
                      "{item.text}"
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Empty State / Request Intelligence */}
          <div className="py-16 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-slate-400 text-3xl">analytics</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No insights generated yet</h3>
            <p className="text-slate-500 text-sm max-w-sm mb-6">
              Our intelligence engine is still processing the latest campaign data. This usually takes 24-48 hours after launch.
            </p>
            <button className="bg-[#FF6600] hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-orange-500/20 text-sm">
              Request Intelligence Refresh
            </button>
          </div>
        </>
      )}
    </div>
  );
}
