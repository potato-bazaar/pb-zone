import React, { useState } from 'react';
import { Quiz, QuizAnalytics, WinnerRecord } from '../../types/quiz';
import { storageService } from '../../services/storageService';
import { 
  Trophy, 
  Users, 
  Target, 
  TrendingUp, 
  Clock, 
  Search, 
  Check 
} from 'lucide-react';

interface AnalyticsDashboardProps {
  quiz: Quiz;
  analytics: QuizAnalytics;
  winners: WinnerRecord[];
  onRefresh: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  quiz,
  analytics,
  winners,
  onRefresh,
}) => {
  const [winnerSearch, setWinnerSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedStatQuestion, setSelectedStatQuestion] = useState<number | null>(null);

  const filteredWinners = winners.filter((w) => {
    const matchesSearch =
      w.playerName.toLowerCase().includes(winnerSearch.toLowerCase()) ||
      (w.rewardVoucherCode && w.rewardVoucherCode.toLowerCase().includes(winnerSearch.toLowerCase()));
    const matchesTier = tierFilter === 'all' || w.prizeTier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const handleToggleClaim = (winnerId: string) => {
    const updated = winners.map((w) =>
      w.id === winnerId ? { ...w, prizeClaimed: !w.prizeClaimed } : w
    );
    storageService.saveWinners(updated);
    onRefresh();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Overview Title */}
      <div className="border-b border-[#E2E2E2] pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-black">
          Winners & Player Telemetry
        </h1>
        <p className="text-xs text-[#6B6B6B] mt-0.5">
          Performance metrics, winner fulfillment, and question accuracy for <strong className="text-black">{quiz.title}</strong>.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Total Plays</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {analytics.totalPlays.toLocaleString()}
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">Web UI sessions</p>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Winners</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {analytics.totalWinners.toLocaleString()}
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">Scored ≥ {quiz.passScore}/20</p>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Win Rate</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {analytics.winRatePercentage}%
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">Target: 30%</p>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Completion</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {analytics.completionRatePercentage}%
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">Finished all 20 Qs</p>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4 col-span-2 lg:col-span-1">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Average Score</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {analytics.averageScore} <span className="text-xs text-[#6B6B6B]">/ 20</span>
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">Avg duration: {analytics.averageTimeMinutes}m</p>
        </div>
      </div>

      {/* 20-Question Accuracy Heatmap */}
      <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E2E2] pb-4">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              20-Question Accuracy Breakdown
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              Identifies which questions are too difficult or causing drop-offs. Click any bar to inspect telemetry.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 bg-black" />
              <span>&gt;70% Accuracy</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#545454]">
              <span className="h-2.5 w-2.5 bg-[#888888]" />
              <span>50% - 70%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#C62828]">
              <span className="h-2.5 w-2.5 bg-[#C62828]" />
              <span>&lt;50% (Hard)</span>
            </div>
          </div>
        </div>

        {/* 20 Question Columns */}
        <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-20 gap-1.5 pt-2">
          {analytics.questionStats.map((stat) => {
            const isSelected = selectedStatQuestion === stat.questionNumber;
            const barBg =
              stat.correctPercentage >= 70
                ? 'bg-black'
                : stat.correctPercentage >= 50
                ? 'bg-[#888888]'
                : 'bg-[#C62828]';

            return (
              <button
                key={stat.questionNumber}
                onClick={() => setSelectedStatQuestion(stat.questionNumber)}
                className={`p-2 border transition-all text-center flex flex-col justify-between h-28 ${
                  isSelected ? 'border-black bg-[#F6F6F6] ring-1 ring-black' : 'border-[#E2E2E2] bg-white hover:border-black'
                }`}
              >
                <div className="text-[10px] font-mono font-bold text-[#6B6B6B]">
                  Q{stat.questionNumber}
                </div>

                <div className="w-full bg-[#EEEEEE] h-12 flex flex-col justify-end">
                  <div
                    className={`w-full transition-all ${barBg}`}
                    style={{ height: `${stat.correctPercentage}%` }}
                  />
                </div>

                <div className="text-[10px] font-bold font-mono text-black">
                  {stat.correctPercentage}%
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Q details */}
        {selectedStatQuestion !== null && (
          <div className="p-3 bg-[#F6F6F6] border border-[#E2E2E2] flex items-center justify-between text-xs">
            {(() => {
              const qStat = analytics.questionStats.find((s) => s.questionNumber === selectedStatQuestion);
              if (!qStat) return null;
              return (
                <>
                  <div className="space-y-0.5">
                    <div className="font-bold text-black">
                      Question #{qStat.questionNumber}: {qStat.questionText}
                    </div>
                    <div className="text-[#545454] space-x-3">
                      <span>Correct: <strong>{qStat.correctPercentage}%</strong></span>
                      <span>Incorrect: <strong>{qStat.wrongPercentage}%</strong></span>
                      <span>Drop-off Rate: <strong>{qStat.dropoffPercentage}%</strong></span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStatQuestion(null)}
                    className="text-[#6B6B6B] hover:text-black text-xs"
                  >
                    Close
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Winners Roster Table */}
      <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E2E2] pb-4">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              Winning Players & Reward Fulfillment
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              Players who reached or exceeded the {quiz.passScore}/20 pass threshold.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={winnerSearch}
              onChange={(e) => setWinnerSearch(e.target.value)}
              placeholder="Search winner name..."
              className="px-3 py-1.5 border border-[#E2E2E2] text-xs text-black focus:border-black focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-[#E2E2E2]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F6F6] text-[#6B6B6B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E2E2]">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Tier Badge</th>
                <th className="py-3 px-4">Reward Code</th>
                <th className="py-3 px-4 text-center">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E2E2]">
              {filteredWinners.map((w) => (
                <tr key={w.id} className="hover:bg-[#FAFAFA]">
                  <td className="py-3 px-4 font-semibold text-black">{w.playerName}</td>
                  <td className="py-3 px-4 font-mono font-bold text-black">
                    {w.score} / {w.totalQuestions} ({w.percentage}%)
                  </td>
                  <td className="py-3 px-4 font-mono text-[#6B6B6B]">{w.timeSpentSeconds}s</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-[#EEEEEE] text-black">
                      {w.prizeTier}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-black">
                    {w.rewardVoucherCode || 'None'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleClaim(w.id)}
                      className={`px-3 py-1 text-[10px] font-bold border transition-colors ${
                        w.prizeClaimed
                          ? 'bg-[#EBF7EE] border-[#0E8345] text-[#0E8345]'
                          : 'bg-white border-[#E2E2E2] text-black hover:border-black'
                      }`}
                    >
                      {w.prizeClaimed ? '✓ Claimed' : 'Pending'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
