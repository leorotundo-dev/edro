type UxFrameProps = {
  src: string;
  title?: string;
  className?: string;
};

export default function UxFrame({ src, title, className }: UxFrameProps) {
  const safeTitle = title ?? "UX Frame";
  const frameClass = className ?? "h-screen w-full border-0";
  return (
    <iframe
      title={safeTitle}
      src={src}
      className={frameClass}
    />
  );
}
