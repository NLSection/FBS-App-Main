import type { Periode } from '@/lib/maandperiodes';

const MAAND_NAMEN = ['Januari','Februari','Maart','April','Mei','Juni','Juli','Augustus','September','Oktober','November','December'];
const MAAND_KORT  = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];

const jaarKnop = (actief: boolean): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  fontWeight: actief ? 600 : 400,
  background: actief ? 'var(--accent)' : 'var(--bg-card)',
  color: actief ? '#fff' : 'var(--text-dim)',
  border: actief ? '1px solid transparent' : '1px solid var(--border)',
});

interface MaandFilterProps {
  periodes: Periode[];
  geselecteerdJaar: number;
  geselecteerdePeriode: Periode | null;
  onJaarChange: (jaar: number) => void;
  onPeriodeChange: (periode: Periode | null) => void;
  toonAlle?: boolean;
}

export default function MaandFilter({
  periodes,
  geselecteerdJaar,
  geselecteerdePeriode,
  onJaarChange,
  onPeriodeChange,
  toonAlle = true,
}: MaandFilterProps) {
  const jaarOpties      = [...new Set(periodes.map(p => p.jaar))].sort((a, b) => a - b);
  const periodesVoorJaar = periodes.filter(p => p.jaar === geselecteerdJaar);

  return (
    <div>
      {/* Jaarknoppen */}
      {jaarOpties.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          {jaarOpties.map(jaar => (
            <button key={jaar} onClick={() => onJaarChange(jaar)} style={jaarKnop(geselecteerdJaar === jaar)}>
              {jaar}
            </button>
          ))}
        </div>
      )}

      {/* Maandknoppen */}
      {periodesVoorJaar.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: toonAlle ? 'auto repeat(12, 1fr)' : 'repeat(12, 1fr)', gap: 6 }}>
          {toonAlle && (
            <button
              onClick={() => onPeriodeChange(null)}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 12, textAlign: 'center',
                fontWeight: !geselecteerdePeriode ? 600 : 400,
                background: !geselecteerdePeriode ? 'var(--accent)' : 'var(--bg-card)',
                color: !geselecteerdePeriode ? '#fff' : 'var(--text-dim)',
                border: !geselecteerdePeriode ? '1px solid transparent' : '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              Alle
            </button>
          )}
          {periodesVoorJaar.map(p => {
            const geselecteerd = geselecteerdePeriode?.jaar === p.jaar && geselecteerdePeriode?.maand === p.maand;
            const toekomstig   = p.status === 'toekomstig';
            const actueel      = p.status === 'actueel';

            let bg: string, kleur: string, border: string, cursor: string, opacity: number;
            if (geselecteerd) {
              bg = 'var(--accent)'; kleur = '#fff';
              border = '1px solid transparent'; cursor = 'pointer'; opacity = 1;
            } else if (toekomstig) {
              bg = 'var(--bg-card)'; kleur = 'var(--text-dim)';
              border = '1px solid var(--border)'; cursor = 'not-allowed'; opacity = 0.3;
            } else if (actueel) {
              bg = 'transparent'; kleur = 'var(--accent)';
              border = '1px solid var(--accent)'; cursor = 'pointer'; opacity = 1;
            } else {
              bg = 'var(--bg-card)'; kleur = 'var(--text-dim)';
              border = '1px solid var(--border)'; cursor = 'pointer'; opacity = 1;
            }

            return (
              <button
                key={`${p.jaar}-${p.maand}`}
                onClick={() => !toekomstig && onPeriodeChange(p)}
                style={{
                  padding: '4px 0', borderRadius: 6, fontSize: 12, textAlign: 'center',
                  fontWeight: geselecteerd ? 600 : 400,
                  background: bg, color: kleur, border, cursor, opacity,
                  pointerEvents: toekomstig ? 'none' : 'auto',
                }}
              >
                <span className="maand-vol">{MAAND_NAMEN[p.maand - 1]}</span>
                <span className="maand-kort">{MAAND_KORT[p.maand - 1]}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
