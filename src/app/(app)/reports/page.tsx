import { requireAdmin } from "@/lib/auth";
import { ComingSoon } from "@/components/coming-soon";

export default async function ReportsPage() {
  await requireAdmin();
  return <ComingSoon title="Reports" phase={6} />;
}
