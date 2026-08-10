import Sidebar from "@/components/Sidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal">
      <Sidebar />
      <main className="portalmain">{children}</main>
    </div>
  );
}
