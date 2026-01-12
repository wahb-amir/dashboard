import LayoutWrapper from "./layoutWrapper";
import { User } from "lucide-react";
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
