export const metadata = {
  title: "ECHO Brand Self-Assessment",
  description: "ECHO Brand Self-Assessment Webapp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
