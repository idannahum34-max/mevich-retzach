
import './globals.css';

export const metadata = {
  title: 'מביך רצח',
  description: 'פתח חדר. שלח לינק. תראה מי הכי מביך בחבורה.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
