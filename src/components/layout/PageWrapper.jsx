export default function PageWrapper({
  hasHeader = true,
  hasBottomNav = false,
  className = '',
  children,
}) {
  const paddingTop = hasHeader ? 'pt-14' : '';
  const paddingBottom = hasBottomNav ? 'pb-16' : '';

  return (
    <div
      className={`min-h-screen bg-bg ${paddingTop} ${paddingBottom} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
