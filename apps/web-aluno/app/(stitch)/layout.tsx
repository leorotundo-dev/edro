import './stitch.css';

export default function StitchLayout({ children }: { children: React.ReactNode }) {
  return <div className="font-body">{children}</div>;
}
