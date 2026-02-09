export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AuthProvider is now in the root layout via Providers
  return <>{children}</>;
}
