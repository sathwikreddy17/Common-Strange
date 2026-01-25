import { AuthProvider } from "@/lib/auth";

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
