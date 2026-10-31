export function PageContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`mx-auto min-h-screen w-full max-w-[1120px] px-5 py-9 pb-28 sm:px-8 lg:px-12 lg:py-14 lg:pb-14 ${className}`}>{children}</main>;
}
