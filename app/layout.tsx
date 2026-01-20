export const metadata = {
  title: "ECHO Brand Self-Assessment",
  description: "ECHO Brand Self-Assessment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body style={{ margin: 0, fontFamily: "system-ui" }}>
        <div id="__echo_airbag__" style={{ padding: 12 }}>
          {children}
        </div>

        {/* Airbag: zeigt JS-Fehler statt weiss */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e){
                const el = document.getElementById('__echo_airbag__');
                if(!el) return;
                el.innerHTML =
                  '<div style="max-width:900px;margin:40px auto;padding:16px;border:1px solid rgba(220,0,0,.25);border-radius:14px;background:rgba(220,0,0,.06)">' +
                  '<div style="font-weight:800;font-size:22px;margin-bottom:10px">Fehler in der Webapp</div>' +
                  '<div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \\'Liberation Mono\\', \\'Courier New\\', monospace;white-space:pre-wrap;font-size:13px;line-height:1.5">' +
                  (e.message || 'Unbekannter Fehler') +
                  '</div>' +
                  '</div>';
              });
              window.addEventListener('unhandledrejection', function(e){
                const el = document.getElementById('__echo_airbag__');
                if(!el) return;
                const msg = (e.reason && (e.reason.message || e.reason.toString())) || 'Unhandled Promise Rejection';
                el.innerHTML =
                  '<div style="max-width:900px;margin:40px auto;padding:16px;border:1px solid rgba(220,0,0,.25);border-radius:14px;background:rgba(220,0,0,.06)">' +
                  '<div style="font-weight:800;font-size:22px;margin-bottom:10px">Fehler in der Webapp</div>' +
                  '<div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \\'Liberation Mono\\', \\'Courier New\\', monospace;white-space:pre-wrap;font-size:13px;line-height:1.5">' +
                  msg +
                  '</div>' +
                  '</div>';
              });
            `,
          }}
        />
      </body>
    </html>
  );
}
