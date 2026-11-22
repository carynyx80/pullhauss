import { RoomHead } from '../pages/AppShell'
import { useStore } from '../lib/store'
import { ago, short } from '../lib/util'

export default function Activity() {
  const { activity } = useStore()
  return (
    <>
      <RoomHead id="activity" title="Activity" lead="Your private history. It's decrypted locally from your notes and never stored on a server." />
      <div className="card">
        {activity.length === 0 ? <div className="empty">Nothing yet.</div> : (
          <div className="tablewrap"><table className="t"><thead><tr><th>Type</th><th>Detail</th><th>Signature</th><th>When</th></tr></thead><tbody>
            {activity.map((a) => (
              <tr key={a.id}><td><span className="badge">{a.kind}</span></td><td style={{ fontFamily: 'var(--sans)' }}>{a.detail}</td><td className="dim">{short(a.sig, 6, 6)}</td><td className="dim">{ago(a.time)}</td></tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </>
  )
}
