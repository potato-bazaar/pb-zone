import React, { useMemo, useState } from 'react';
import { Quiz, QuizAnalytics, WinnerRecord } from '../../types/quiz';
import { storageService } from '../../services/storageService';
import { useQuizTelemetry } from '../../hooks/useQuizTelemetry';
import { RefreshCw } from 'lucide-react';

interface AnalyticsDashboardProps {
  quiz: Quiz;
  analytics: QuizAnalytics;
  winners: WinnerRecord[];
  onRefresh: () => void;
  liveFromApi?: boolean;
}

function statusLabel(status: string) {
  if (status === 'completed') return 'Winner';
  if (status === 'active') return 'Playing';
  return status || '—';
}

function statusClass(status: string) {
  if (status === 'completed') return 'bg-[#EBF7EE] text-[#0E8345]';
  if (status === 'active') return 'bg-[#FFF6E5] text-[#B45309]';
  return 'bg-[#EEEEEE] text-[#545454]';
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  quiz,
  analytics,
  winners,
  onRefresh,
  liveFromApi = false,
}) => {
  const live = useQuizTelemetry(liveFromApi);
  const [winnerSearch, setWinnerSearch] = useState('');
  const [selectedStatQuestion, setSelectedStatQuestion] = useState<number | null>(null);

  const questionsPerQuiz = liveFromApi ? live.data.questionsPerQuiz || 12 : 20;
  const totalPlays = liveFromApi ? live.data.playerCount : analytics.totalPlays;
  const totalWinners = liveFromApi ? live.data.winnersCount : analytics.totalWinners;
  const winRate = liveFromApi ? live.data.winRatePercentage : analytics.winRatePercentage;
  const completion = liveFromApi ? live.data.completionRatePercentage : analytics.completionRatePercentage;
  const averageScore = liveFromApi ? live.data.averageScore : analytics.averageScore;
  const averageTime = liveFromApi ? live.data.averageTimeMinutes : analytics.averageTimeMinutes;
  const questionStats = liveFromApi ? live.data.questionStats : analytics.questionStats;

  const players = useMemo(() => {
    if (liveFromApi) {
      const q = winnerSearch.trim().toLowerCase();
      return live.data.players.filter((player) =>
        q ? player.playerName.toLowerCase().includes(q) : true,
      );
    }
    return [];
  }, [liveFromApi, live.data.players, winnerSearch]);

  const filteredWinners = winners.filter((w) => {
    const matchesSearch =
      w.playerName.toLowerCase().includes(winnerSearch.toLowerCase()) ||
      (w.rewardVoucherCode && w.rewardVoucherCode.toLowerCase().includes(winnerSearch.toLowerCase()));
    return matchesSearch;
  });

  const handleToggleClaim = (winnerId: string) => {
    const updated = winners.map((w) =>
      w.id === winnerId ? { ...w, prizeClaimed: !w.prizeClaimed } : w
    );
    storageService.saveWinners(updated);
    onRefresh();
  };

  const loadingNumbers = liveFromApi && live.loading && live.data.players.length === 0;

  return (
    <div className="space-y-6 pb-16">
      <div className="border-b border-[#E2E2E2] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Winners & Player Telemetry
          </h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            {liveFromApi
              ? `Live ${questionsPerQuiz}-question Quiz Time leaderboard. Highest points stay on top.`
              : `Performance metrics, winner fulfillment, and question accuracy for ${quiz.title}.`}
          </p>
        </div>
        {liveFromApi && (
          <button
            onClick={() => void live.refresh(false)}
            disabled={live.loading || live.refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-black text-black text-xs font-bold hover:bg-[#F6F6F6] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${live.loading || live.refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {liveFromApi && live.error && (
        <div className="bg-[#FDECEC] border border-[#C62828] text-[#C62828] text-xs px-4 py-3">
          {live.error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Total Plays</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {loadingNumbers ? '—' : totalPlays.toLocaleString()}
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">
            {liveFromApi ? 'Unique players who played' : 'Web UI sessions'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Winners</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {loadingNumbers ? '—' : totalWinners.toLocaleString()}
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">
            {liveFromApi
              ? `Finished all ${questionsPerQuiz} Qs`
              : `Scored ≥ ${quiz.passScore}/20`}
          </p>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Win Rate</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {loadingNumbers ? '—' : `${winRate}%`}
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">
            {liveFromApi ? 'Winners / unique players' : 'Target: 30%'}
          </p>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Completion</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {loadingNumbers ? '—' : `${completion}%`}
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">
            Finished all {questionsPerQuiz} Qs
          </p>
        </div>

        <div className="bg-white border border-[#E2E2E2] p-4 col-span-2 lg:col-span-1">
          <div className="text-[10px] font-bold uppercase text-[#6B6B6B]">Average Score</div>
          <div className="text-2xl font-bold text-black font-mono mt-1">
            {loadingNumbers ? '—' : averageScore}{' '}
            <span className="text-xs text-[#6B6B6B]">/ {questionsPerQuiz}</span>
          </div>
          <p className="text-[10px] text-[#6B6B6B] mt-0.5">Avg duration: {averageTime}m</p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E2E2] pb-4">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              {questionsPerQuiz}-Question Accuracy Breakdown
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              {liveFromApi
                ? `Accuracy by question slot (Q1–Q${questionsPerQuiz}) across live player sessions.`
                : 'Identifies which questions are too difficult or causing drop-offs. Click any bar to inspect telemetry.'}
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

        <div className={`grid grid-cols-4 sm:grid-cols-6 ${questionsPerQuiz <= 12 ? 'lg:grid-cols-12' : 'lg:grid-cols-20'} gap-1.5 pt-2`}>
          {questionStats.map((stat) => {
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
                    style={{ height: `${Math.max(stat.correctPercentage, 0)}%` }}
                  />
                </div>

                <div className="text-[10px] font-bold font-mono text-black">
                  {stat.correctPercentage}%
                </div>
              </button>
            );
          })}
        </div>

        {selectedStatQuestion !== null && (
          <div className="p-3 bg-[#F6F6F6] border border-[#E2E2E2] flex items-center justify-between text-xs">
            {(() => {
              const qStat = questionStats.find((s) => s.questionNumber === selectedStatQuestion);
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
                      {'skipPercentage' in qStat && (
                        <span>Skipped: <strong>{(qStat as { skipPercentage?: number }).skipPercentage ?? 0}%</strong></span>
                      )}
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

      <div className="bg-white border border-[#E2E2E2] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E2E2] pb-4">
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider">
              {liveFromApi ? 'Players Leaderboard' : 'Winning Players & Reward Fulfillment'}
            </h3>
            <p className="text-xs text-[#6B6B6B]">
              {liveFromApi
                ? 'Live players ranked by total points. Correct, skipped, wrong, score and points for the latest session.'
                : `Players who reached or exceeded the ${quiz.passScore}/20 pass threshold.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={winnerSearch}
              onChange={(e) => setWinnerSearch(e.target.value)}
              placeholder={liveFromApi ? 'Search player name...' : 'Search winner name...'}
              className="px-3 py-1.5 border border-[#E2E2E2] text-xs text-black focus:border-black focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-[#E2E2E2]">
          {liveFromApi ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F6F6] text-[#6B6B6B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E2E2]">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Correct</th>
                  <th className="py-3 px-4">Skipped</th>
                  <th className="py-3 px-4">Wrong</th>
                  <th className="py-3 px-4">Score</th>
                  <th className="py-3 px-4">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E2E2]">
                {players.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-4 text-center text-[#6B6B6B]">
                      {live.loading ? 'Loading live players…' : 'No players have started Quiz Time yet.'}
                    </td>
                  </tr>
                ) : (
                  players.map((player) => (
                    <tr key={player.userId} className="hover:bg-[#FAFAFA]">
                      <td className="py-3 px-4 font-mono font-bold text-black">{player.rank}</td>
                      <td className="py-3 px-4 font-semibold text-black">{player.playerName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(player.status)}`}>
                          {statusLabel(player.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-black">
                        {player.correctCount}/{player.totalQuestions}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#6B6B6B]">{player.skippedCount}</td>
                      <td className="py-3 px-4 font-mono text-[#6B6B6B]">{player.wrongCount}</td>
                      <td className="py-3 px-4 font-mono font-bold text-black">
                        {player.sessionScore}{' '}
                        <span className="text-[#6B6B6B] font-normal">({player.percentage}%)</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-black">{player.userPoints}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};
