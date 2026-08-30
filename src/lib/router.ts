import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'studio' }
  | { name: 'gigs' }
  | { name: 'drafts' }
  | { name: 'hq' }
  | { name: 'hq-command' }
  | { name: 'hq-roundtable'; projectId?: string }
  | { name: 'hq-create' }
  | { name: 'hq-projects' }
  | { name: 'hq-project'; id: string }
  | { name: 'hq-assets' }
  | { name: 'hq-factory' }
  | { name: 'hq-publish' }
  | { name: 'hq-tools' }
  | { name: 'hq-dock' }

export function parseHash(): Route {
  const h = window.location.hash.replace(/^#/, '')
  if (!h || h === '/' || h === 'top') return { name: 'home' }
  const parts = h.split('/').filter(Boolean)

  // Legacy studio routes (existing Kimmy studio)
  if (parts[0] === 'studio') {
    if (parts[1] === 'gigs') return { name: 'gigs' }
    if (parts[1] === 'drafts') return { name: 'drafts' }
    return { name: 'studio' }
  }

  // Headquarters routes
  if (parts[0] === 'hq') {
    if (parts[1] === 'command') return { name: 'hq-command' }
    if (parts[1] === 'roundtable') return { name: 'hq-roundtable', projectId: parts[2] }
    if (parts[1] === 'create') return { name: 'hq-create' }
    if (parts[1] === 'projects') {
      if (parts[2]) return { name: 'hq-project', id: parts[2] }
      return { name: 'hq-projects' }
    }
    if (parts[1] === 'assets') return { name: 'hq-assets' }
    if (parts[1] === 'factory') return { name: 'hq-factory' }
    if (parts[1] === 'publish') return { name: 'hq-publish' }
    if (parts[1] === 'tools') return { name: 'hq-tools' }
    if (parts[1] === 'dock') return { name: 'hq-dock' }
    return { name: 'hq-command' }
  }

  return { name: 'home' }
}

export function navigate(route: Route) {
  let h = '/'
  switch (route.name) {
    case 'studio':
      h = '/studio'
      break
    case 'gigs':
      h = '/studio/gigs'
      break
    case 'drafts':
      h = '/studio/drafts'
      break
    case 'hq':
    case 'hq-command':
      h = '/hq/command'
      break
    case 'hq-roundtable':
      h = route.projectId
        ? `/hq/roundtable/${route.projectId}`
        : '/hq/roundtable'
      break
    case 'hq-create':
      h = '/hq/create'
      break
    case 'hq-projects':
      h = '/hq/projects'
      break
    case 'hq-project':
      h = `/hq/projects/${route.id}`
      break
    case 'hq-assets':
      h = '/hq/assets'
      break
    case 'hq-factory':
      h = '/hq/factory'
      break
    case 'hq-publish':
      h = '/hq/publish'
      break
    case 'hq-tools':
      h = '/hq/tools'
      break
    case 'hq-dock':
      h = '/hq/dock'
      break
    default:
      h = '/'
  }
  window.location.hash = h
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash())
  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}
