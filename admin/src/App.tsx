import React, { useState, useEffect } from 'react';
import { Quiz, QuizAnalytics, QuizQuestion, WinnerRecord, Game } from './types/quiz';
import { CONFIG_LABELS, ConfigKind, GameConfig, getGameKind, isConfigKind } from './types/gameConfig';
import { storageService } from './services/storageService';
import { getGroqModel, hasGroqKey } from './services/groqClient';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabId } from './components/layout/Sidebar';
import { GameHubView } from './components/views/GameHubView';
import { ActiveQuizView } from './components/views/ActiveQuizView';
import { SetupQuizView } from './components/views/SetupQuizView';
import { PreviousQuizzesView } from './components/views/PreviousQuizzesView';
import { QuizDetailView } from './components/editor/QuizDetailView';
import { QuestionRegenModal } from './components/editor/QuestionRegenModal';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { WebGameSimulator } from './components/simulator/WebGameSimulator';
import { SettingsModal } from './components/settings/SettingsModal';
import { GameConfigActiveView } from './components/gameconfig/GameConfigActiveView';
import { GameConfigEditorView } from './components/gameconfig/GameConfigEditorView';
import { GameConfigSetupView } from './components/gameconfig/GameConfigSetupView';
import { GameConfigLibraryView } from './components/gameconfig/GameConfigLibraryView';
import { GameConfigTelemetryView } from './components/gameconfig/GameConfigTelemetryView';
import { GameConfigPreviewModal } from './components/gameconfig/GameConfigPreviewModal';

export function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [activeGameId, setActiveGameId] = useState<string>('');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeQuizId, setActiveQuizId] = useState<string>('');
  const [gameConfigs, setGameConfigs] = useState<GameConfig[]>([]);
  const [activeConfigIds, setActiveConfigIds] = useState<Record<string, string>>({});
  const [currentTab, setCurrentTab] = useState<TabId>('games'); // Default to the Games Directory page
  const [winners, setWinners] = useState<WinnerRecord[]>([]);
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);

  // Modals
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isConfigPreviewOpen, setIsConfigPreviewOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [regenTargetQuestion, setRegenTargetQuestion] = useState<QuizQuestion | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Bumped when Settings closes so the AI engine label re-reads localStorage
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

  /* ---------------- Derived state ---------------- */

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
  const aiEngineLabel = groqOn ? `Groq · ${getGroqModel()}` : 'Offline Engine';

  const getQuizCountForGame = (gameId: string) => quizzes.filter((q) => q.gameId === gameId).length;
  const getRotationCountForGame = (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    return getGameKind(game?.format) === 'quiz'
      ? quizzes.filter((q) => q.gameId === gameId && q.inRotation).length
      : gameConfigs.filter((c) => c.gameId === gameId && c.inRotation).length;
  };
  const getConfigCountForGame = (gameId: string) => gameConfigs.filter((c) => c.gameId === gameId).length;

  /* ---------------- Game selection ---------------- */

  const handleSelectGame = (gameId: string) => {
    setActiveGameId(gameId);
    storageService.setActiveGameId(gameId);
    const gameObj = games.find((g) => g.id === gameId);
    const kind = getGameKind(gameObj?.format);
    setCurrentTab('active');

    if (kind === 'quiz') {
      const gameQuizzes = quizzes.filter((q) => q.gameId === gameId);
      const nextId = gameQuizzes[0]?.id || '';
      setActiveQuizId(nextId);
      storageService.setActiveQuizId(nextId);
      showToast(
        gameQuizzes.length
          ? `Selected "${gameObj?.name}". Managing this game's rounds.`
          : `Selected "${gameObj?.name}". No decks yet, generate one in Setup.`
      );
    } else {
      const cfgs = gameConfigs.filter((c) => c.gameId === gameId);
      const packs = CONFIG_LABELS[kind].packs.toLowerCase();
      showToast(
        cfgs.length
          ? `Selected "${gameObj?.name}". Managing its ${packs}.`
          : `Selected "${gameObj?.name}". No ${packs} yet, generate one in Setup.`
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

  /* ---------------- Quiz handlers ---------------- */

  const handleSelectQuiz = (id: string) => {
    setActiveQuizId(id);
    storageService.setActiveQuizId(id);
    showToast(`Switched active quiz: ${quizzes.find((q) => q.id === id)?.title}`);
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

  const handleQuizCreated = (newQuiz: Quiz) => {
    const scopedQuiz = { ...newQuiz, gameId: activeGameId };
    storageService.saveQuiz(scopedQuiz);
    setQuizzes((prev) => [scopedQuiz, ...prev]);
    setActiveQuizId(scopedQuiz.id);
    storageService.setActiveQuizId(scopedQuiz.id);
    setCurrentTab('manage');
    showToast(`New ${scopedQuiz.questions.length}-round deck generated!`);
  };

  const handleBatchCreated = (newPool: Quiz[]) => {
    const scopedPool = newPool.map((q) => ({ ...q, gameId: activeGameId }));
    const combined = [...scopedPool, ...quizzes];
    storageService.saveQuizzes(combined);
    setQuizzes(combined);
    if (scopedPool.length > 0) {
      setActiveQuizId(scopedPool[0].id);
      storageService.setActiveQuizId(scopedPool[0].id);
    }
    setCurrentTab('previous');
    showToast(`Generated ${scopedPool.length} decks in the pool for ${activeGame?.name}!`);
  };

  const handleToggleRotation = (id: string) => {
    const updated = quizzes.map((q) => (q.id === id ? { ...q, inRotation: !q.inRotation } : q));
    storageService.saveQuizzes(updated);
    setQuizzes(updated);
    const target = updated.find((q) => q.id === id);
    showToast(target?.inRotation ? 'Added to rotation pool' : 'Removed from rotation pool');
  };

  const handleDeleteQuiz = (id: string) => {
    if (currentGameQuizzes.length <= 1) {
      alert('Cannot delete the last remaining quiz for this game.');
      return;
    }
    storageService.deleteQuiz(id);
    const remaining = quizzes.filter((q) => q.id !== id);
    setQuizzes(remaining);
    if (activeQuizId === id) {
      const next = remaining.find((q) => q.gameId === activeGameId);
      setActiveQuizId(next?.id || '');
      storageService.setActiveQuizId(next?.id || '');
    }
    showToast('Quiz deleted');
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

  /* ---------------- Game config handlers (Crush / Spin / Rush) ---------------- */

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
    setCurrentTab(scoped.length > 1 ? 'previous' : 'manage');
    const labels = configKind ? CONFIG_LABELS[configKind] : null;
    showToast(
      scoped.length > 1
        ? `Generated ${scoped.length} ${labels?.packs.toLowerCase() || 'configs'} for ${activeGame?.name}!`
        : `New ${labels?.pack.toLowerCase() || 'config'} ready: ${scoped[0]?.title}`
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

  /* ---------------- Shared ---------------- */

  const openSimulator = () => {
    if (isQuizGame) setIsSimulatorOpen(true);
    else setIsConfigPreviewOpen(true);
  };

  const renderEmptyState = () => {
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
            : 'Generate an initial 20-question challenge or a batch pool of up to 200 quizzes for this game.'}
        </p>
        <button
          onClick={() => setCurrentTab('setup')}
          className="px-5 py-2.5 bg-black text-white text-xs font-bold hover:bg-[#262626]"
        >
          Go to Setup
        </button>
      </div>
    );
  };

  const switcherItems = isQuizGame
    ? currentGameQuizzes.map((q) => ({ id: q.id, title: q.title, status: q.status }))
    : currentGameConfigs.map((c) => ({ id: c.id, title: c.title, status: c.status }));
  const activeItem = isQuizGame ? activeQuiz : activeConfig;

  return (
    <div className="min-h-screen bg-[#F6F6F6] text-black flex flex-col font-sans">
      <Navbar
        activeGame={activeGame}
        switcherLabel={isQuizGame ? 'Quiz' : CONFIG_LABELS[configKind].pack}
        switcherItems={switcherItems}
        activeItemId={activeItem?.id || ''}
        onSelectItem={isQuizGame ? handleSelectQuiz : handleSelectConfig}
        onOpenGameSelector={() => setCurrentTab('games')}
        onOpenSimulator={openSimulator}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTogglePublish={isQuizGame ? handleTogglePublish : handleToggleConfigPublish}
        isPublished={activeItem?.status === 'published'}
        showPublish={Boolean(activeItem)}
        activeRotationCount={rotationPoolCount}
        simulatorLabel={isQuizGame ? 'Play Simulator' : 'Preview'}
        aiEngineLabel={aiEngineLabel}
        aiEngineOnline={groqOn}
      />

      <div className="flex-1 flex flex-col md:flex-row">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            if (tab === 'simulator') openSimulator();
            else setCurrentTab(tab);
          }}
          activeGame={activeGame}
          kind={activeKind}
          activeItemTitle={activeItem?.title || (isQuizGame ? 'No Quizzes Yet' : 'No Configuration Yet')}
          totalItemsCount={isQuizGame ? currentGameQuizzes.length : currentGameConfigs.length}
          rotationPoolCount={rotationPoolCount}
        />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'games' && (
            <GameHubView
              games={games}
              activeGameId={activeGameId}
              onSelectGame={handleSelectGame}
              onCreateGame={handleCreateGame}
              getQuizCountForGame={getQuizCountForGame}
              getRotationCountForGame={getRotationCountForGame}
              getConfigCountForGame={getConfigCountForGame}
            />
          )}

          {/* ---------- Quiz-style games ---------- */}
          {isQuizGame && currentTab === 'active' && (
            activeQuiz ? (
              <ActiveQuizView
                quiz={activeQuiz}
                onNavigateToManage={() => setCurrentTab('manage')}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                onRegenerateQuestion={(q) => setRegenTargetQuestion(q)}
                onTogglePublish={handleTogglePublish}
                liveFromApi={activeGame?.format === 'pb-quiz'}
              />
            ) : (
              renderEmptyState()
            )
          )}

          {isQuizGame && currentTab === 'manage' && (
            activeQuiz ? (
              <QuizDetailView
                quiz={activeQuiz}
                onUpdateQuiz={handleUpdateQuiz}
                onNavigateToSetup={() => setCurrentTab('setup')}
                onOpenSimulator={() => setIsSimulatorOpen(true)}
                liveFromApi={activeGame?.format === 'pb-quiz'}
              />
            ) : (
              renderEmptyState()
            )
          )}

          {isQuizGame && currentTab === 'setup' && (
            <SetupQuizView
              activeGame={activeGame}
              onQuizCreated={handleQuizCreated}
              onBatchCreated={handleBatchCreated}
              onNavigateToManage={() => setCurrentTab('manage')}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {isQuizGame && currentTab === 'previous' && (
            <PreviousQuizzesView
              quizzes={currentGameQuizzes}
              activeQuizId={activeQuiz?.id || ''}
              onSelectActiveQuiz={handleSelectQuiz}
              onToggleRotation={handleToggleRotation}
              onDeleteQuiz={handleDeleteQuiz}
              onNavigateToSetup={() => setCurrentTab('setup')}
              onNavigateToManage={(id) => {
                handleSelectQuiz(id);
                setCurrentTab('manage');
              }}
            />
          )}

          {isQuizGame && currentTab === 'analytics' && (
            activeQuiz && analytics ? (
              <AnalyticsDashboard
                quiz={activeQuiz}
                analytics={analytics}
                winners={winners}
                onRefresh={loadData}
                liveFromApi={activeGame?.format === 'pb-quiz'}
              />
            ) : (
              renderEmptyState()
            )
          )}

          {/* ---------- Config-style games (Crush / Spin / Rush) ---------- */}
          {configKind && activeGame && currentTab === 'active' && (
            activeConfig ? (
              <GameConfigActiveView
                config={activeConfig}
                game={activeGame}
                rotationCount={rotationPoolCount}
                onNavigateToManage={() => setCurrentTab('manage')}
                onNavigateToSetup={() => setCurrentTab('setup')}
                onOpenPreview={() => setIsConfigPreviewOpen(true)}
                onTogglePublish={handleToggleConfigPublish}
              />
            ) : (
              renderEmptyState()
            )
          )}

          {configKind && activeGame && currentTab === 'manage' && (
            activeConfig ? (
              <GameConfigEditorView
                key={activeConfig.id}
                config={activeConfig}
                game={activeGame}
                onSave={handleUpdateConfig}
                onNavigateToSetup={() => setCurrentTab('setup')}
                onOpenPreview={() => setIsConfigPreviewOpen(true)}
              />
            ) : (
              renderEmptyState()
            )
          )}

          {configKind && activeGame && currentTab === 'setup' && (
            <GameConfigSetupView
              key={activeGame.id}
              game={activeGame}
              kind={configKind}
              activeConfig={activeConfig}
              hasKey={groqOn}
              model={getGroqModel()}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onConfigsCreated={handleConfigsCreated}
            />
          )}

          {configKind && currentTab === 'previous' && (
            <GameConfigLibraryView
              configs={currentGameConfigs}
              activeConfigId={activeConfig?.id || ''}
              kind={configKind}
              onSelectActive={handleSelectConfig}
              onToggleRotation={handleToggleConfigRotation}
              onDelete={handleDeleteConfig}
              onNavigateToSetup={() => setCurrentTab('setup')}
              onNavigateToManage={(id) => {
                handleSelectConfig(id);
                setCurrentTab('manage');
              }}
            />
          )}

          {configKind && activeGame && currentTab === 'analytics' && (
            <GameConfigTelemetryView configs={currentGameConfigs} game={activeGame} kind={configKind} />
          )}
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

      {isQuizGame && activeQuiz && (
        <WebGameSimulator
          quiz={activeQuiz}
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          onGameCompleted={loadData}
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

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setEngineTick((t) => t + 1);
        }}
        onResetData={loadData}
      />
    </div>
  );
}

export default App;
