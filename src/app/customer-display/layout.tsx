export const metadata = {
  title: "Customer Display — DELRON AI POS",
  robots: "noindex",
};

export default function CustomerDisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0f172a" }}>{children}</body>
    </html>
  );
}
