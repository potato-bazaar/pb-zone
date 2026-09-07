import React, { useState } from 'react';
import { Quiz } from '../../types/quiz';
import { 
  History, 
  Search, 
  Filter, 
  Check, 
  Play, 
  Trash2, 
  Layers, 
  Users, 
  ExternalLink,
  Plus
} from 'lucide-react';

interface PreviousQuizzesViewProps {
  quizzes: Quiz[];
  activeQuizId: string;
  onSelectActiveQuiz: (id: string) => void;
  onToggleRotation: (id: string) => void;
  onDeleteQuiz: (id: string) => void;
  onNavigateToSetup: () => void;
  onNavigateToManage: (id: string) => void;
}

export const PreviousQuizzesView: React.FC<PreviousQuizzesViewProps> = ({
  quizzes,
  activeQuizId,
  onSelectActiveQuiz,
  onToggleRotation,
  onDeleteQuiz,
  onNavigateToSetup,
  onNavigateToManage,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'rotation' | 'draft'>('all');

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.topic.toLowerCase().includes(search.toLowerCase()) ||
      (q.poolGroup && q.poolGroup.toLowerCase().includes(search.toLowerCase()));

    if (filterMode === 'rotation') return matchesSearch && q.inRotation;
    if (filterMode === 'draft') return matchesSearch && q.status === 'draft';
    return matchesSearch;
  });

  const rotationCount = quizzes.filter((q) => q.inRotation).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="border-b border-[#E2E2E2] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">Previous Quizzes</h1>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Full library of generated quizzes and multiplayer rotation pool ({quizzes.length} total quizzes in database).
          </p>
        </div>

        <button
          onClick={onNavigateToSetup}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-bold hover:bg-[#262626] transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Generate More Quizzes</span>
        </button>
      </div>

      {/* Rotation Pool Summary Box */}
      <div className="p-4 bg-white border border-[#E2E2E2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-black">
              Player Rotation Pool Status
            </span>
            <span className="bg-[#0E8345] text-white font-mono text-[10px] font-bold px-2 py-0.5">
              {rotationCount} Quizzes Active in Pool
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B]">
            Different users automatically receive different quizzes from this active pool to prevent question repetition.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#6B6B6B]">Filter:</span>
          <div className="flex border border-[#E2E2E2]">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-semibold ${
                filterMode === 'all' ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F6F6F6]'
              }`}
            >
              All ({quizzes.length})
            </button>
            <button
              onClick={() => setFilterMode('rotation')}
              className={`px-3 py-1.5 text-xs font-semibold border-l border-[#E2E2E2] ${
                filterMode === 'rotation' ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F6F6F6]'
              }`}
            >
              In Rotation ({rotationCount})
            </button>
            <button
              onClick={() => setFilterMode('draft')}
              className={`px-3 py-1.5 text-xs font-semibold border-l border-[#E2E2E2] ${
                filterMode === 'draft' ? 'bg-black text-white' : 'bg-white text-black hover:bg-[#F6F6F6]'
              }`}
            >
              Drafts
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B6B6B]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search quiz title, topic, batch group..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2E2E2] text-xs text-black placeholder-[#6B6B6B] focus:border-black focus:outline-none"
        />
      </div>

      {/* Table of Quizzes */}
      <div className="bg-white border border-[#E2E2E2] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F6F6F6] text-[#6B6B6B] uppercase font-bold text-[10px] tracking-wider border-b border-[#E2E2E2]">
            <tr>
              <th className="py-3 px-4">Quiz Title & Topic</th>
              <th className="py-3 px-4">Questions</th>
              <th className="py-3 px-4">Difficulty</th>
              <th className="py-3 px-4">Plays</th>
              <th className="py-3 px-4">Player Rotation</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E2E2]">
            {filteredQuizzes.map((q) => {
              const isCurrent = q.id === activeQuizId;
              return (
                <tr key={q.id} className={`hover:bg-[#FAFAFA] transition-colors ${isCurrent ? 'bg-[#F9F9F9]' : ''}`}>
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black text-xs">{q.title}</span>
                        {isCurrent && (
                          <span className="bg-black text-white text-[9px] font-bold px-1.5 py-0.2 uppercase">
                            CURRENT ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#6B6B6B]">{q.topic}</p>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-black">
                    {q.questions.length} Qs
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="uppercase text-[10px] font-semibold text-[#545454] bg-[#EEEEEE] px-2 py-0.5">
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#545454]">
                    {q.playsCount}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onToggleRotation(q.id)}
                      className={`px-2.5 py-1 text-[10px] font-bold border uppercase transition-colors ${
                        q.inRotation
                          ? 'bg-[#EBF7EE] border-[#0E8345] text-[#0E8345]'
                          : 'bg-white border-[#E2E2E2] text-[#6B6B6B] hover:border-black'
                      }`}
                    >
                      {q.inRotation ? '✓ In Rotation' : '+ Add to Rotation'}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!isCurrent && (
                        <button
                          onClick={() => onSelectActiveQuiz(q.id)}
                          className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#E2E2E2] hover:border-black text-black transition-colors"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => onNavigateToManage(q.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-black text-white hover:bg-[#262626] transition-colors"
                      >
                        Manage
                      </button>
                      {quizzes.length > 1 && (
                        <button
                          onClick={() => onDeleteQuiz(q.id)}
                          className="p-1 text-[#6B6B6B] hover:text-[#C62828] transition-colors"
                          title="Delete Quiz"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredQuizzes.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[#6B6B6B]">
                  No quizzes found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
