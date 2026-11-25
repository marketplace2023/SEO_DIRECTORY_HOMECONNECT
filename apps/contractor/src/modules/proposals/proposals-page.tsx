import { PiArrowUpRight } from "react-icons/pi";
import { useStore } from "@/domain/store";
import { useAuth } from "@/auth/auth-provider";
import { Panel, Empty, copy } from "@/components/ecosystem/primitives";
import { Button } from "@/components/ui/button";
import { navigate } from "@/lib/navigation";
import { money, type Language } from "@/domain/types";
import { EstimateWorkspacePanel } from "./estimate-workspace";
import { EstimatingWorkflow } from "./estimating-workflow";

export function ProposalsPage({
  language,
  requestId,
}: {
  language: Language;
  requestId?: string;
}) {
  const { user } = useAuth();
  const { state, professionalId } = useStore(),
    t = copy(language);
  const proposals = state.proposals.filter(
    (p) => p.professionalId === professionalId,
  );
  return (
    <div className="grid gap-5">
      <EstimatingWorkflow language={language} requestId={requestId} />
      {user?.professionalId === professionalId && (
        <EstimateWorkspacePanel key={professionalId} language={language} />
      )}
      <Panel title={t("Mis propuestas", "My proposals")}>
        {proposals.length ? (
          proposals.map((proposal) => (
            <button
              className="eco-record"
              key={proposal.id}
              onClick={() =>
                navigate(
                  "/workspace/contractor/proposals",
                  new URLSearchParams({ request: proposal.requestId }),
                )
              }
            >
              <div>
                <h3>
                  {
                    state.requests.find((r) => r.id === proposal.requestId)
                      ?.title
                  }
                </h3>
                <p>
                  {proposal.days} {t("días", "days")} ·{" "}
                  {money(proposal.amount, language, 2)}
                </p>
              </div>
              <span className={`eco-badge ${proposal.status}`}>
                {proposal.status === "accepted"
                  ? t("Aceptada", "Accepted")
                  : proposal.status === "submitted"
                    ? t("Enviada", "Submitted")
                    : t("Cerrada", "Closed")}
              </span>
              <PiArrowUpRight />
            </button>
          ))
        ) : (
          <Empty
            title={t(
              "Todavía no has enviado propuestas",
              "No proposals sent yet",
            )}
          >
            <Button onClick={() => navigate("/workspace/contractor/requests")}>
              {t("Explorar oportunidades", "Explore opportunities")}
            </Button>
          </Empty>
        )}
      </Panel>
    </div>
  );
}
