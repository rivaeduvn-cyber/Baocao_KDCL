import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 md:p-6 transition-colors">
          {children}
        </main>
      </div>
    </div>
  );
}
