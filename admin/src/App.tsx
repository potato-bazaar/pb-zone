import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Quiz, QuizAnalytics, QuizQuestion, WinnerRecord, Game } from './types/quiz';
import { CONFIG_LABELS, ConfigKind, GameConfig, getGameKind, isConfigKind } from './types/gameConfig';
import { storageService } from './services/storageService';
import { getGroqModel, hasGroqKey } from './services/groqClient';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { PlaceholderView } from './components/views/PlaceholderView';
import { PlayersView } from './components/views/PlayersView';
import { GameHubView } from './components/views/GameHubView';
import { GameDetailView } from './components/views/GameDetailView';
import { ActiveQuizView } from './components/views/ActiveQuizView';
import { QuizDetailView } from './components/editor/QuizDetailView';
import { QuestionRegenModal } from './components/editor/QuestionRegenModal';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { SettingsModal } from './components/settings/SettingsModal';
import { GameWorkspace } from './components/layout/GameWorkspace';
import { GameConfigEditorView } from './components/gameconfig/GameConfigEditorView';
import { GameConfigSetupView } from './components/gameconfig/GameConfigSetupView';
import { GameConfigLibraryView } from './components/gameconfig/GameConfigLibraryView';
import { GameConfigTelemetryView } from './components/gameconfig/GameConfigTelemetryView';
import { GameConfigPreviewModal } from './components/gameconfig/GameConfigPreviewModal';

type GameSection = 'active' | 'edit' | 'setup' | 'library' | 'quiz-management' | 'questions' | 'telemetry';

function fallbackQuizForGame(game: Game): Quiz {
  return {
    id: `${game.id}-live-bank`,
    gameId: game.id,
    title: game.name,
    description: game.description,
    topic: game.tagline || game.name,
    subTheme: '',
    difficulty: 'mixed',
    tone: 'fun',
    status: 'published',
    questionsCount: 0,
    passScore: 0,
    timeLimitSeconds: 15,
    createdAt: game.createdAt,
    updatedAt: game.createdAt,
    version: 1,
    playsCount: game.totalPlays,
    winnersCount: game.totalWinners,
    tags: [],
    questions: [],
  };
}

export function App() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [activeGameId, setActiveGameId] = useState<string>('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<string>('');
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([]);
  const [activeConfigIds, setActiveConfigIds] = useState<Record<string, string>>({});
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isConfigPreviewOpen, setIsConfigPreviewOpen] = useState(false);
  const [regenTargetQuestion, setRegenTargetQuestion] = useState<QuizQuestion | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [engineTick, setEngineTick] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = () => {
    const loadedGames = storageService.getGames();
    setGames(loadedGames);
    const savedGameId = storageService.getActiveGameId();
    const resolvedGameId = loadedGames.some((g) => g.id === savedGameId) ? savedGameId : loadedGames[0]?.id || '';
    setActiveGameId(resolvedGameId);

    const loadedQuizzes = storageService.getQuizzes();
    setQuizzes(loadedQuizzes);
    const gameQuizzes = loadedQuizzes.filter((q) => q.gameId === resolvedGameId);
    const savedActiveQuizId = storageService.getActiveQuizId();
    if (gameQuizzes.some((q) => q.id === savedActiveQuizId)) {
      setActiveQuizId(savedActiveQuizId);
    } else if (gameQuizzes.length > 0) {
      setActiveQuizId(gameQuizzes[0].id);
    } else {
      setActiveQuizId('');
    }

    setGameConfigs(storageService.getGameConfigs());
    setActiveConfigIds(storageService.getActiveConfigIds());
    setWinners(storageService.getWinners());
    setAnalytics(storageService.getAnalytics());
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeGame = games.find((g) => g.id === activeGameId) || games[0] || null;
  const activeKind = getGameKind(activeGame?.format);
  const configKind: ConfigKind | null = isConfigKind(activeKind) ? activeKind : null;
  const isQuizGame = configKind === null;

  const currentGameQuizzes = quizzes.filter((q) => q.gameId === activeGameId);
  const activeQuiz = isQuizGame
    ? currentGameQuizzes.find((q) => q.id === activeQuizId) || currentGameQuizzes[0] || null
    : null;

  const currentGameConfigs = gameConfigs.filter((c) => c.gameId === activeGameId);
  const activeConfig = configKind
    ? currentGameConfigs.find((c) => c.id === activeConfigIds[activeGameId]) || currentGameConfigs[0] || null
    : null;

  const rotationPoolCount = isQuizGame
    ? currentGameQuizzes.filter((q) => q.inRotation).length
    : currentGameConfigs.filter((c) => c.inRotation).length;

  void engineTick;
  const groqOn = hasGroqKey();

  const getQuizCountForGame = (gameId: string) => quizzes.filter((q) => q.gameId === gameId).length;
  const getRotationCountForGame = (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    return getGameKind(game?.format) === 'quiz'
      ? quizzes.filter((q) => q.gameId === gameId && q.inRotation).length
      : gameConfigs.filter((c) => c.gameId === gameId && c.inRotation).length;
  };
  const getConfigCountForGame = (gameId: string) => gameConfigs.filter((c) => c.gameId === gameId).length;

  const applyGameId = useCallback((gameId: string) => {
    setActiveGameId(gameId);
    storageService.setActiveGameId(gameId);
    const gameObj = games.find((g) => g.id === gameId);
    const kind = getGameKind(gameObj?.format);
    if (kind === 'quiz') {
      const gameQuizzes = quizzes.filter((q) => q.gameId === gameId);
      const nextId = gameQuizzes[0]?.id || '';
      setActiveQuizId(nextId);
      storageService.setActiveQuizId(nextId);
    }
  }, [games, quizzes]);

  const handleSelectGame = (gameId: string) => {
    applyGameId(gameId);
    const gameObj = games.find((g) => g.id === gameId);
    const kind = getGameKind(gameObj?.format);
    navigate(kind === 'quiz' ? `/games/${gameId}/questions` : `/games/${gameId}`);
    if (kind === 'quiz') {
      const gameQuizzes = quizzes.filter((q) => q.gameId === gameId);
      showToast(
        gameQuizzes.length
          ? `Selected "${gameObj?.name}". Managing this game's rounds.`
          : `Selected "${gameObj?.name}". No decks yet.`,
      );
    } else {
      const cfgs = gameConfigs.filter((c) => c.gameId === gameId);
      const packs = CONFIG_LABELS[kind].packs.toLowerCase();
      showToast(
        cfgs.length
          ? `Selected "${gameObj?.name}". Managing its ${packs}.`
          : `Selected "${gameObj?.name}". No ${packs} yet, generate one in Setup.`,
      );
    }
  };

  const handleCreateGame = (newGame: Game) => {
    const updatedGames = [...games, newGame];
    storageService.saveGames(updatedGames);
    setGames(updatedGames);
    handleSelectGame(newGame.id);
    showToast(`Created game: "${newGame.name}". Now set up its content with AI.`);
  };

  const handleUpdateQuiz = (updated: Quiz) => {
    storageService.saveQuiz(updated);
    setQuizzes((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    showToast('Quiz updated successfully');
  };

  const handleTogglePublish = () => {
    if (!activeQuiz) return;
    const newStatus = activeQuiz.status === 'published' ? 'draft' : 'published';
    handleUpdateQuiz({ ...activeQuiz, status: newStatus, updatedAt: new Date().toISOString() });
    showToast(newStatus === 'published' ? 'Quiz Published & Live' : 'Quiz Moved to Draft');
  };

  const handleApplySwap = (newQuestion: QuizQuestion) => {
    if (!activeQuiz) return;
    handleUpdateQuiz({
      ...activeQuiz,
      questions: activeQuiz.questions.map((q) => (q.id === newQuestion.id ? newQuestion : q)),
    });
    setRegenTargetQuestion(null);
    showToast(`Swapped Question #${newQuestion.order}!`);
  };

  const setActiveConfigFor = (gameId: string, configId: string) => {
    setActiveConfigIds((prev) => ({ ...prev, [gameId]: configId }));
    storageService.setActiveConfigId(gameId, configId);
  };

  const handleConfigsCreated = (created: GameConfig[]) => {
    const scoped = created.map((c) => ({ ...c, gameId: activeGameId }));
    const combined = [...scoped, ...gameConfigs];
    storageService.saveGameConfigs(combined);
    setGameConfigs(combined);
    if (scoped.length > 0) setActiveConfigFor(activeGameId, scoped[0].id);
    navigate(scoped.length > 1 ? `/games/${activeGameId}/library` : `/games/${activeGameId}/edit`);
    const labels = configKind ? CONFIG_LABELS[configKind] : null;
    showToast(
      scoped.length > 1
        ? `Generated ${scoped.length} ${labels?.packs.toLowerCase() || 'configs'} for ${activeGame?.name}!`
        : `New ${labels?.pack.toLowerCase() || 'config'} ready: ${scoped[0]?.title}`,
    );
  };

  const handleUpdateConfig = (updated: GameConfig) => {
    const stamped: GameConfig = { ...updated, updatedAt: new Date().toISOString(), version: updated.version + 1 };
    storageService.saveGameConfig(stamped);
    setGameConfigs((prev) => prev.map((c) => (c.id === stamped.id ? stamped : c)));
    showToast('Configuration saved');
  };

  const handleSelectConfig = (id: string) => {
    const cfg = gameConfigs.find((c) => c.id === id);
    if (!cfg) return;
    setActiveConfigFor(cfg.gameId, id);
    showToast(`Switched active ${CONFIG_LABELS[cfg.kind].pack.toLowerCase()}: ${cfg.title}`);
  };

  const handleToggleConfigPublish = () => {
    if (!activeConfig) return;
    const newStatus = activeConfig.status === 'published' ? 'draft' : 'published';
    const stamped: GameConfig = { ...activeConfig, status: newStatus, updatedAt: new Date().toISOString() };
    storageService.saveGameConfig(stamped);
    setGameConfigs((prev) => prev.map((c) => (c.id === stamped.id ? stamped : c)));
    showToast(newStatus === 'published' ? 'Configuration Published & Live' : 'Configuration Moved to Draft');
  };

  const handleToggleConfigRotation = (id: string) => {
    const updated = gameConfigs.map((c) => (c.id === id ? { ...c, inRotation: !c.inRotation } : c));
    storageService.saveGameConfigs(updated);
    setGameConfigs(updated);
    const target = updated.find((c) => c.id === id);
    showToast(target?.inRotation ? 'Added to rotation pool' : 'Removed from rotation pool');
  };

  const handleDeleteConfig = (id: string) => {
    const target = gameConfigs.find((c) => c.id === id);
    if (!target) return;
    if (!confirm(`Delete "${target.title}"? This cannot be undone.`)) return;
    storageService.deleteGameConfig(id);
    const remaining = gameConfigs.filter((c) => c.id !== id);
    setGameConfigs(remaining);
    if (activeConfigIds[target.gameId] === id) {
      const next = remaining.find((c) => c.gameId === target.gameId);
      setActiveConfigFor(target.gameId, next?.id || '');
    }
    showToast('Configuration deleted');
  };

  const renderEmptyState = (gameId: string) => {
    const noun = configKind ? CONFIG_LABELS[configKind].packs : 'Quizzes';
    return (
      <div className="bg-white border border-[#E2E2E2] p-12 text-center space-y-4">
        <span className="text-4xl">{activeGame?.icon || '🎮'}</span>
        <h3 className="text-base font-bold text-black">
          No {noun} Created for "{activeGame?.name}" Yet
        </h3>
        <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">
          {configKind
            ? `Generate a ${CONFIG_LABELS[configKind].pack.toLowerCase()} with the AI designer. Every ${CONFIG_LABELS[configKind].item.toLowerCase()} can be hand-edited afterwards.`
            : 'This game has no quiz decks yet. Open Manage to work with the live question bank.'}
        </p>
        <button
          onClick={() => navigate(configKind ? `/games/${gameId}/setup` : `/games/${gameId}/questions`)}
          className="px-5 py-2.5 bg-black text-white text-xs font-bold hover:bg-[#262626]"
        >
          {configKind ? 'Go to Setup' : 'Go to Questions'}
        </button>
      </div>
    );
  };

  const wrapGame = (content: React.ReactNode, sectionLabel?: string) => {
    if (!activeGame) return content;
    return (
      <GameWorkspace game={activeGame} sectionLabel={sectionLabel}>
        {content}
      </GameWorkspace>
    );
  };

  const renderGameSection = (section: GameSection, gameId: string) => {
    if (isQuizGame) {
      if (!activeGame) return renderEmptyState(gameId);
      const liveFromApi = activeGame.format === 'pb-quiz';
      const quiz = activeQuiz || fallbackQuizForGame(activeGame);

      if (section === 'edit' || section === 'questions') {
        if (section === 'edit') return <Navigate to={`/games/${gameId}/questions`} replace />;
        return wrapGame(
          <QuizDetailView quiz={quiz} onUpdateQuiz={handleUpdateQuiz} liveFromApi={liveFromApi} />,
          'Questions',
        );
      }

      if (section === 'quiz-management') {
        return wrapGame(
          <ActiveQuizView
            quiz={quiz}
            onNavigateToManage={() => navigate(`/games/${gameId}/questions`)}
            onRegenerateQuestion={(q) => setRegenTargetQuestion(q)}
            onTogglePublish={handleTogglePublish}
            liveFromApi={liveFromApi}
          />,
          'Quiz Management',
        );
      }

      if (section === 'telemetry') {
        return wrapGame(
          <AnalyticsDashboard
            quiz={quiz}
            analytics={
              analytics || {
                quizId: quiz.id,
                totalPlays: 0,
                completedPlays: 0,
                totalWinners: 0,
                winRatePercentage: 0,
                completionRatePercentage: 0,
                averageScore: 0,
                averageTimeMinutes: 0,
                questionStats: [],
              }
            }
            winners={winners}
            onRefresh={loadData}
            liveFromApi={liveFromApi}
          />,
          'Telemetry',
        );
      }

      if (section === 'setup' || section === 'library') {
        return <Navigate to={`/games/${gameId}`} replace />;
      }

      return wrapGame(
        <GameDetailView
          game={activeGame}
          quiz={quiz}
          liveFromApi={liveFromApi}
          onNavigateToManage={() => navigate(`/games/${gameId}/questions`)}
          onUpdateQuiz={handleUpdateQuiz}
          onTogglePublish={handleTogglePublish}
        />,
      );
    }

    if (!configKind || !activeGame) return renderEmptyState(gameId);

    if (section === 'questions' || section === 'quiz-management' || section === 'telemetry') {
      return <Navigate to={`/games/${gameId}`} replace />;
    }

    if (section === 'setup') {
      return wrapGame(
        <GameConfigSetupView
          key={activeGame.id}
          game={activeGame}
          kind={configKind}
          activeConfig={activeConfig}
          hasKey={groqOn}
          model={getGroqModel()}
          onOpenSettings={() => navigate('/settings')}
          onConfigsCreated={handleConfigsCreated}
        />,
        'Setup',
      );
    }

    if (section === 'library') {
      return wrapGame(
        <GameConfigLibraryView
          configs={currentGameConfigs}
          activeConfigId={activeConfig?.id || ''}
          kind={configKind}
          onSelectActive={handleSelectConfig}
          onToggleRotation={handleToggleConfigRotation}
          onDelete={handleDeleteConfig}
          onNavigateToSetup={() => navigate(`/games/${gameId}/setup`)}
          onNavigateToManage={(id) => {
            handleSelectConfig(id);
            navigate(`/games/${gameId}/edit`);
          }}
        />,
        'Library',
      );
    }

    if (section === 'edit') {
      return wrapGame(
        activeConfig ? (
          <GameConfigEditorView
            key={activeConfig.id}
            config={activeConfig}
            game={activeGame}
            onSave={handleUpdateConfig}
            onNavigateToSetup={() => navigate(`/games/${gameId}/setup`)}
            onOpenPreview={() => setIsConfigPreviewOpen(true)}
          />
        ) : (
          renderEmptyState(gameId)
        ),
        'Editor',
      );
    }

    return wrapGame(
      <GameDetailView
        game={activeGame}
        config={activeConfig}
        configKind={configKind}
        rotationCount={rotationPoolCount}
        onNavigateToManage={() => navigate(`/games/${gameId}/edit`)}
        onNavigateToSetup={() => navigate(`/games/${gameId}/setup`)}
        onOpenPreview={() => setIsConfigPreviewOpen(true)}
        onTogglePublish={handleToggleConfigPublish}
      />,
    );
  };

  const renderWinnersOrAnalytics = (kind: 'winners' | 'analytics') => {
    if (isQuizGame) {
      return activeQuiz && analytics ? (
        <AnalyticsDashboard
          quiz={activeQuiz}
          analytics={analytics}
          winners={winners}
          onRefresh={loadData}
          liveFromApi={activeGame?.format === 'pb-quiz'}
        />
      ) : (
        <PlaceholderView
          title={kind === 'winners' ? 'Winners' : 'Analytics'}
          description="Play data appears after a quiz game is available."
        />
      );
    }
    if (configKind && activeGame) {
      return <GameConfigTelemetryView configs={currentGameConfigs} game={activeGame} kind={configKind} />;
    }
    return (
      <PlaceholderView
        title={kind === 'winners' ? 'Winners' : 'Analytics'}
        description="Select a game to see performance."
      />
    );
  };

  const shellSidebar = <Sidebar onNavigate={() => setMobileNavOpen(false)} />;

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <div className="hidden h-full md:flex">{shellSidebar}</div>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[18rem]">{shellSidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-3">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <DashboardView
                  games={games}
                  winners={winners}
                  searchQuery={searchQuery}
                  onOpenGame={handleSelectGame}
                />
              }
            />
            <Route
              path="/games"
              element={
                <GameHubView
                  games={games}
                  activeGameId={activeGameId}
                  searchQuery={searchQuery}
                  onSelectGame={handleSelectGame}
                  onCreateGame={handleCreateGame}
                  getQuizCountForGame={getQuizCountForGame}
                  getRotationCountForGame={getRotationCountForGame}
                  getConfigCountForGame={getConfigCountForGame}
                />
              }
            />
            <Route path="/games/:gameId" element={<GameRouteSync activeGameId={activeGameId} onSync={applyGameId} render={(id) => renderGameSection('active', id)} />} />
            <Route path="/games/:gameId/quiz-management" element={<GameRouteSync activeGameId={activeGameId} onSync={applyGameId} render={(id) => renderGameSection('quiz-management', id)} />} />
            <Route path="/games/:gameId/questions" element={<GameRouteSync activeGameId={activeGameId} onSync={applyGameId} render={(id) => renderGameSection('questions', id)} />} />
            <Route path="/games/:gameId/telemetry" element={<GameRouteSync activeGameId={activeGameId} onSync={applyGameId} render={(id) => renderGameSection('telemetry', id)} />} />
            <Route path="/games/:gameId/edit" element={<GameRouteSync activeGameId={activeGameId} onSync={applyGameId} render={(id) => renderGameSection('edit', id)} />} />
            <Route path="/games/:gameId/setup" element={<GameRouteSync activeGameId={activeGameId} onSync={applyGameId} render={(id) => renderGameSection('setup', id)} />} />
            <Route path="/games/:gameId/library" element={<GameRouteSync activeGameId={activeGameId} onSync={applyGameId} render={(id) => renderGameSection('library', id)} />} />
            <Route
              path="/rewards"
              element={
                <PlaceholderView
                  title="Rewards"
                  description="Prize tiers and gift fulfillment for PB Zone games."
                />
              }
            />
            <Route path="/players" element={<PlayersView searchQuery={searchQuery} />} />
            <Route path="/winners" element={renderWinnersOrAnalytics('winners')} />
            <Route
              path="/orders"
              element={
                <PlaceholderView
                  title="Orders / Claims"
                  description="Reward orders and pending prize claims."
                />
              }
            />
            <Route path="/analytics" element={renderWinnersOrAnalytics('analytics')} />
            <Route
              path="/settings"
              element={
                <SettingsModal
                  isOpen
                  onClose={() => {
                    setEngineTick((t) => t + 1);
                    navigate('/dashboard');
                  }}
                  onResetData={loadData}
                />
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white px-4 py-3 text-xs font-semibold shadow-xl border border-black flex items-center gap-2 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {regenTargetQuestion && activeQuiz && (
        <QuestionRegenModal
          question={regenTargetQuestion}
          quizTopic={activeQuiz.topic}
          isOpen={Boolean(regenTargetQuestion)}
          onClose={() => setRegenTargetQuestion(null)}
          onApplySwap={handleApplySwap}
        />
      )}

      {configKind && (
        <GameConfigPreviewModal
          config={activeConfig}
          game={activeGame}
          isOpen={isConfigPreviewOpen}
          onClose={() => setIsConfigPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function GameRouteSync({
  activeGameId,
  onSync,
  render,
}: {
  activeGameId: string;
  onSync: (gameId: string) => void;
  render: (gameId: string) => React.ReactNode;
}) {
  const { gameId = '' } = useParams();

  useEffect(() => {
    if (gameId && gameId !== activeGameId) onSync(gameId);
  }, [gameId, activeGameId, onSync]);

  if (!gameId) return <Navigate to="/games" replace />;
  return <>{render(gameId)}</>;
}

export default App;
