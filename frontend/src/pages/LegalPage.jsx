import { colors, screenStyle } from '../styles/theme';
import AppBar from '../components/AppBar';
import { LEGAL_DOCUMENTS, LEGAL_EFFECTIVE_DATE } from '../content/legal';

const isEmail = (text) => /^[^\s@]+@[^\s@]+$/.test(text);

function LegalLine({ text }) {
  if (isEmail(text)) {
    return <a href={`mailto:${text}`} style={{ color: colors.primary, wordBreak: 'break-all' }}>{text}</a>;
  }
  return text;
}

export default function LegalPage({ documentKey }) {
  const { title, sections } = LEGAL_DOCUMENTS[documentKey];
  return (
    <main style={screenStyle}>
      <AppBar title={title} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 28px' }}>
        <p style={{ fontSize: 12, color: colors.outline }}>{LEGAL_EFFECTIVE_DATE}</p>
        {sections.map((section) => (
          <section key={section.heading} style={{ marginTop: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: '700', color: colors.onSurface }}>{section.heading}</h2>
            {section.body.map((line) => (
              <p key={line} style={{ marginTop: 6, fontSize: 13, lineHeight: '20px', color: colors.onSurfaceVariant }}>
                <LegalLine text={line} />
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
