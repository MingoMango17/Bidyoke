import { Pause, Play, SkipForward } from 'lucide-react'
import { Command, PlayerStatus, type SessionState } from '../protocol'
import type { SessionApi } from '../session/useSession'
import { Button } from './ui/Button'

interface Props {
  state: SessionState
  send: SessionApi['send']
}

export function PlayerControls({ state, send }: Props) {
  const playing = state.player.status === PlayerStatus.Playing
  const idle = !state.nowPlaying

  return (
    <div className="flex gap-2">
      <Button disabled={idle} onClick={() => send(playing ? Command.PlayerPause : Command.PlayerResume)}>
        {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        {playing ? 'Pause' : 'Resume'}
      </Button>
      <Button variant="secondary" disabled={idle} onClick={() => send(Command.PlayerNext)}>
        <SkipForward className="size-5" />
        Next
      </Button>
    </div>
  )
}
