import { Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { GeneratingOverlay } from './components/DocumentCanvas/GeneratingOverlay'
import { AuthProvider, useAuth } from './state/AuthContext'
import { ThemeProvider } from './state/ThemeContext'
import { PaperProvider, usePaper } from './state/PaperContext'
import type { AppView } from './state/types'
import { Sidebar } from './components/Sidebar/Sidebar'
import { Dashboard } from './components/Sidebar/Dashboard'
import { TemplatesList } from './components/Sidebar/TemplatesList'
import { RecentPapers } from './components/Sidebar/RecentPapers'
import { SettingsPanel } from './components/Sidebar/SettingsPanel'
import { DocumentCanvas } from './components/DocumentCanvas/DocumentCanvas'
import { AnswerKeyEditor } from './components/AnswerKey/AnswerKeyEditor'
import { PromptPanel } from './components/PromptPanel/PromptPanel'
import { ExportBar } from './components/ExportBar/ExportBar'
import { AuthScreen } from './components/Auth/AuthScreen'
import { RequireAuth } from './components/Auth/RequireAuth'
import { LandingPage } from './components/Landing/LandingPage'

function EditorWorkspace() {
  const { paper, loading, viewMode, generating, llmInfo, generationPhase, generationElapsed } =
    usePaper()

  if (loading || !paper) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        {loading && <Loader2 className="size-4 animate-spin" />}
        {loading ? 'Loading paper…' : 'No paper selected'}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="relative flex-1 overflow-hidden">
        <div className={cn('h-full', viewMode !== 'paper' && 'hidden')}>
          <DocumentCanvas key={paper.paper_id} paper={paper} />
        </div>
        {viewMode === 'answer_key' && <AnswerKeyEditor />}
        {generating && (
          <GeneratingOverlay
            modelName={llmInfo?.llm_model}
            provider={llmInfo?.llm_provider}
            phase={generationPhase ?? undefined}
            serverElapsed={generationElapsed}
          />
        )}
      </div>
      <ExportBar />
    </div>
  )
}

function AppShell() {
  const { loadPaper } = usePaper()
  const [activeView, setActiveView] = useState<AppView>('home')
  const [showEditor, setShowEditor] = useState(false)

  const openPaper = useCallback(
    async (paperId: string) => {
      await loadPaper(paperId)
      setShowEditor(true)
      setActiveView('editor')
    },
    [loadPaper],
  )

  return (
    <div className="flex h-full">
      <Sidebar
        activeView={showEditor ? 'editor' : activeView}
        onNavigate={(view) => {
          if (view !== 'editor') {
            setShowEditor(false)
            setActiveView(view)
          }
        }}
      />

      {showEditor ? (
        <div className="flex min-w-0 flex-1">
          <EditorWorkspace />
          <PromptPanel />
        </div>
      ) : (
        <main className="flex-1 overflow-hidden bg-surface">
          {activeView === 'home' && (
            <Dashboard
              onOpenPaper={(id) => void openPaper(id)}
              onNewPaper={(id) => void openPaper(id)}
            />
          )}
          {activeView === 'templates' && (
            <TemplatesList onSelectTemplate={(id) => void openPaper(id)} />
          )}
          {activeView === 'recent' && (
            <RecentPapers onOpenPaper={(id) => void openPaper(id)} />
          )}
          {activeView === 'settings' && <SettingsPanel />}
        </main>
      )}
    </div>
  )
}

function AppRoutes() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthScreen />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <PaperProvider>
              <AppShell />
            </PaperProvider>
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
