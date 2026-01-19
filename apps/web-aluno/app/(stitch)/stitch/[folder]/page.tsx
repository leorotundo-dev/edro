import fs from 'fs';
import path from 'path';
import Script from 'next/script';
import { notFound } from 'next/navigation';

const resolveStitchRoot = () => {
  const candidates = [
    path.resolve(process.cwd(), 'stitch_today_s_dashboard'),
    path.resolve(process.cwd(), '..', 'stitch_today_s_dashboard'),
    path.resolve(process.cwd(), '..', '..', 'stitch_today_s_dashboard'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
};

const STITCH_ROOT = resolveStitchRoot();

const extractBodyClass = (html: string) => {
  const match = html.match(/<body[^>]*class=["']([^"']+)["'][^>]*>/i);
  return match ? match[1] : '';
};

const extractStyles = (html: string) => {
  const matches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  return matches.map((match) => match[1]).join('\n');
};

const extractBodyHtml = (html: string) => {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
};

const CANONICAL_TAILWIND_SRC = 'https://cdn.tailwindcss.com?plugins=forms,container-queries';

const CANONICAL_TAILWIND_CONFIG = `
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#7f13ec",
        "primary-light": "#9b4bf1",
        "primary-dark": "#5a2eea",
        "secondary": "#3d0a6e",
        "secondary-lilac": "#e0cffc",
        "secondary-bg": "#ede7f3",
        "background-light": "#f7f6f8",
        "background-dark": "#191022",
        "surface-light": "#ffffff",
        "surface-dark": "#2d1f3f",
        "text-main": "#140d1b",
        "text-muted": "#7a7a7a"
      },
      fontFamily: {
        "display": ["Lexend", "sans-serif"],
        "title": ["Sora", "sans-serif"],
        "body": ["Manrope", "sans-serif"]
      },
      borderRadius: {
        "card": "20px"
      },
      boxShadow: {
        "soft": "0 4px 20px -2px rgba(127, 19, 236, 0.08)",
        "glow": "0 0 15px rgba(159, 134, 227, 0.4)"
      }
    }
  }
};
`;

const stripScripts = (html: string) => html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

export async function generateStaticParams() {
  if (!fs.existsSync(STITCH_ROOT)) {
    return [];
  }
  return fs
    .readdirSync(STITCH_ROOT, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({ folder: dirent.name }));
}

export default function StitchFolderPage({ params }: { params: { folder: string } }) {
  const folder = decodeURIComponent(params.folder);
  const filePath = path.join(STITCH_ROOT, folder, 'code.html');

  if (!fs.existsSync(filePath)) {
    notFound();
  }

  const html = fs.readFileSync(filePath, 'utf8');
  const bodyClass = extractBodyClass(html);
  const styles = extractStyles(html);
  const bodyHtml = stripScripts(extractBodyHtml(html));
  return (
    <div className={bodyClass || 'bg-background-light text-text-main'}>
      <Script
        id="tailwind-config-canonical"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: CANONICAL_TAILWIND_CONFIG }}
      />
      <Script src={CANONICAL_TAILWIND_SRC} strategy="beforeInteractive" />
      {styles ? <style dangerouslySetInnerHTML={{ __html: styles }} /> : null}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </div>
  );
}
