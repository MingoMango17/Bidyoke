import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { Layout } from './components/Layout'
import { Guest } from './routes/Guest'
import { Host } from './routes/Host'
import { Landing } from './routes/Landing'

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
})

const routeTree = rootRoute.addChildren([
  createRoute({ getParentRoute: () => rootRoute, path: '/', component: Landing }),
  createRoute({ getParentRoute: () => rootRoute, path: '/host/$code', component: Host }),
  createRoute({ getParentRoute: () => rootRoute, path: '/s/$code', component: Guest }),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
