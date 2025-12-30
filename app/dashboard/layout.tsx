import LayoutWrapper from "./layoutWrapper";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <LayoutWrapper>{children}</LayoutWrapper>
    </div>
  );
}
