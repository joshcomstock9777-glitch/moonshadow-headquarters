import Nav from './components/Nav'
import Hero from './components/Hero'
import Work from './components/Work'
import Genres from './components/Genres'
import Excerpt from './components/Excerpt'
import Process from './components/Process'
import OrderForm from './components/OrderForm'
import Footer from './components/Footer'
import StudioShell from './components/studio/StudioShell'
import StudioOverview from './components/studio/StudioOverview'
import GigScout from './components/studio/GigScout'
import DraftingWorkspace from './components/studio/DraftingWorkspace'
import HqShell from './components/hq/HqShell'
import AuthGate from './components/hq/AuthGate'
import CommandCenter from './components/hq/CommandCenter'
import CreateFlow from './components/hq/CreateFlow'
import ProjectsList, { ProjectDetail } from './components/hq/Projects'
import Roundtable from './components/hq/Roundtable'
import AssetLibrary from './components/hq/AssetLibrary'
import ContentFactory from './components/hq/ContentFactory'
import PublishingCenterVerified from './components/hq/PublishingCenterVerified'
import ToolsConnections from './components/hq/ToolsConnections'
import Dock from './components/hq/Dock'
import { useRoute, navigate } from './lib/router'

export default function App() {
  const route = useRoute()

  // Headquarters routes
  if (route.name.startsWith('hq')) {
    return (
      <AuthGate>
        <div className="relative min-h-screen">
          <div className="grain" aria-hidden="true" />
          <div className="vignette" aria-hidden="true" />
          <HqShell route={route}>
            {route.name === 'hq-command' ? (
              <CommandCenter />
            ) : route.name === 'hq-create' ? (
              <CreateFlow />
            ) : route.name === 'hq-projects' ? (
              <ProjectsList />
            ) : route.name === 'hq-project' ? (
              <ProjectDetail id={route.id} />
            ) : route.name === 'hq-roundtable' ? (
              <Roundtable projectId={route.projectId} />
            ) : route.name === 'hq-assets' ? (
              <AssetLibrary />
            ) : route.name === 'hq-factory' ? (
              <ContentFactory />
            ) : route.name === 'hq-publish' ? (
              <PublishingCenterVerified />
            ) : route.name === 'hq-tools' ? (
              <ToolsConnections />
            ) : route.name === 'hq-dock' ? (
              <Dock />
            ) : (
              <CommandCenter />
            )}
          </HqShell>
        </div>
      </AuthGate>
    )
  }

  // Legacy studio routes (existing Kimmy studio)
  if (route.name !== 'home') {
    return (
      <div className="relative min-h-screen">
        <div className="grain" aria-hidden="true" />
        <div className="vignette" aria-hidden="true" />
        <StudioShell route={route}>
          {route.name === 'gigs' ? (
            <GigScout />
          ) : route.name === 'drafts' ? (
            <DraftingWorkspace />
          ) : (
            <StudioOverview
              onNavigate={(t) =>
                navigate({ name: t === 'gigs' ? 'gigs' : 'drafts' })
              }
            />
          )}
        </StudioShell>
      </div>
    )
  }

  // Landing page
  return (
    <div className="relative min-h-screen">
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Work />
        <Genres />
        <Excerpt />
        <Process />
        <OrderForm />
      </main>
      <Footer />
    </div>
  )
}
